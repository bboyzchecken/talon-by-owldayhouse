package api

import (
	"encoding/csv"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// importRow is one CSV line after parsing and checking.
type importRow struct {
	Row            int    `json:"row"`
	Name           string `json:"name"`
	NormalizedName string `json:"normalized_name"`
	Industry       string `json:"industry"`
	Source         string `json:"source"`
	SourceDetail   string `json:"source_detail"`
	Website        string `json:"website"`
	Contact        string `json:"contact"`
	// Status is one of: new, duplicate, duplicate_in_file, similar, invalid.
	Status    string                 `json:"status"`
	Message   string                 `json:"message,omitempty"`
	Duplicate map[string]interface{} `json:"duplicate,omitempty"`
	Similar   []*models.SimilarLead  `json:"similar,omitempty"`
	LeadID    uint                   `json:"lead_id,omitempty"`
}

// importHeaderAliases maps the accepted column headings (Thai or English) onto
// the field they fill, so a list exported from Excel works as it is.
var importHeaderAliases = map[string]string{
	"name": "name", "company": "name", "company_name": "name",
	"ชื่อบริษัท": "name", "ชื่อ": "name", "บริษัท": "name",
	"industry": "industry", "อุตสาหกรรม": "industry", "กลุ่มธุรกิจ": "industry",
	"source": "source", "แหล่งที่มา": "source", "ที่มา": "source",
	"source_detail": "source_detail", "รายละเอียดแหล่งที่มา": "source_detail", "งาน": "source_detail",
	"website": "website", "เว็บไซต์": "website", "url": "website",
	"contact": "contact", "ผู้ติดต่อ": "contact", "ชื่อผู้ติดต่อ": "contact",
}

// ImportLeads takes a CSV of exhibitors (or any list) in two passes: `preview`
// reports which rows are duplicates, near-duplicates or invalid and whose they
// are, then `commit` creates the ones that are safe to create. Admin only.
//
// Multipart form fields:
//
//	file             the CSV (UTF-8; a BOM from Excel is fine)
//	mode             "preview" (default) or "commit"
//	source           default source for rows whose own column is empty
//	source_detail    default source detail (e.g. the trade fair's name)
//	owner_type       "company" (default) or "sales_existing"
//	owner_user_id    the sales person the rows are assigned to
//	confirm_similar  "1" to create rows that only have a similar name
func (s *Server) ImportLeads(c echo.Context) error {
	mode := c.FormValue("mode")
	if mode == "" {
		mode = "preview"
	}
	if mode != "preview" && mode != "commit" {
		return badRequest(c, "mode ต้องเป็น preview หรือ commit")
	}

	header, err := c.FormFile("file")
	if err != nil {
		return badRequest(c, "แนบไฟล์ CSV มาด้วย (ช่อง file)")
	}
	if header.Size > 5*1024*1024 {
		return badRequest(c, "ไฟล์ CSV ใหญ่เกิน 5 MB")
	}

	file, err := header.Open()
	if err != nil {
		return badRequest(c, "เปิดไฟล์ CSV ไม่ได้")
	}
	defer func() {
		if closeErr := file.Close(); closeErr != nil {
			s.Log.WithError(closeErr).Warn("failed to close the uploaded CSV")
		}
	}()

	rows, err := s.parseImportCSV(file)
	if err != nil {
		return badRequest(c, err.Error())
	}
	if len(rows) == 0 {
		return badRequest(c, "ไม่พบข้อมูลในไฟล์ CSV")
	}
	if len(rows) > 2000 {
		return badRequest(c, "นำเข้าได้ครั้งละไม่เกิน 2,000 แถว")
	}

	defaults := struct {
		Source       string
		SourceDetail string
		OwnerType    string
		OwnerUserID  *uint
	}{
		Source:       strings.TrimSpace(c.FormValue("source")),
		SourceDetail: strings.TrimSpace(c.FormValue("source_detail")),
		OwnerType:    strings.TrimSpace(c.FormValue("owner_type")),
		OwnerUserID:  formUint(c, "owner_user_id"),
	}
	if defaults.OwnerType == "" {
		defaults.OwnerType = models.OwnerTypeCompany
	}

	confirmSimilar := c.FormValue("confirm_similar") == "1"
	me := actor(c)

	cutoff, err := s.leadCutoff()
	if err != nil {
		return s.serverError(c, err)
	}
	owner, err := leadrules.ResolveOwnerOnCreate(
		me, defaults.OwnerType, defaults.OwnerUserID, time.Now().In(leadrules.Bangkok), cutoff,
	)
	if err != nil {
		return s.ruleError(c, err)
	}

	// Pass 1: check every row, including against the other rows in the file.
	seen := make(map[string]int, len(rows))
	for _, row := range rows {
		if row.Status == "invalid" {
			continue
		}
		if row.Source == "" {
			row.Source = defaults.Source
		}
		if row.SourceDetail == "" {
			row.SourceDetail = defaults.SourceDetail
		}
		if !isValidSource(row.Source) {
			row.Status = "invalid"
			row.Message = "ไม่ระบุแหล่งที่มา (source) หรือค่าไม่ถูกต้อง"
			continue
		}
		if !isValidIndustry(row.Industry) {
			row.Industry = models.IndustryOther
		}

		if firstRow, ok := seen[row.NormalizedName]; ok {
			row.Status = "duplicate_in_file"
			row.Message = "ชื่อซ้ำกับแถวที่ " + strconv.Itoa(firstRow) + " ในไฟล์เดียวกัน"
			continue
		}
		seen[row.NormalizedName] = row.Row

		existing, findErr := s.LeadStore.FindByNormalizedName(row.NormalizedName)
		if findErr == nil {
			row.Status = "duplicate"
			row.Duplicate = duplicateBody(existing)["duplicate"].(map[string]interface{})
			row.Message = "มีอยู่ในระบบแล้ว"
			continue
		} else if !isNotFound(findErr) {
			return s.serverError(c, findErr)
		}

		similar, findErr := s.LeadStore.FindSimilar(row.NormalizedName, s.Config.Leads.SimilarityThreshold, 3)
		if findErr != nil {
			return s.serverError(c, findErr)
		}
		if len(similar) > 0 {
			row.Status = "similar"
			row.Similar = similar
			row.Message = "มีลูกค้าชื่อคล้ายกันอยู่แล้ว"
			continue
		}
		row.Status = "new"
	}

	summary := map[string]int{"new": 0, "duplicate": 0, "duplicate_in_file": 0, "similar": 0, "invalid": 0, "created": 0}
	for _, row := range rows {
		summary[row.Status]++
	}

	if mode == "preview" {
		return c.JSON(http.StatusOK, map[string]interface{}{
			"mode":    "preview",
			"summary": summary,
			"rows":    rows,
			"owner":   map[string]interface{}{"owner_type": owner.OwnerType, "owner_user_id": owner.OwnerUserID},
		})
	}

	// Pass 2: create. Duplicates are never created; similar rows only on confirm.
	now := time.Now().In(leadrules.Bangkok)
	for _, row := range rows {
		creatable := row.Status == "new" || (row.Status == "similar" && confirmSimilar)
		if !creatable {
			continue
		}

		lead := &models.Lead{
			Name:           row.Name,
			NormalizedName: row.NormalizedName,
			Website:        row.Website,
			Industry:       row.Industry,
			Source:         row.Source,
			SourceDetail:   row.SourceDetail,
			OwnerType:      owner.OwnerType,
			OwnerUserID:    owner.OwnerUserID,
			RegisteredBy:   me.ID,
			RegisteredAt:   now,
			Stage:          models.StageNew,
			Interests:      validInterests(nil),
		}
		if err := s.LeadStore.Create(lead); err != nil {
			// Someone registered the same name between the two passes.
			row.Status = "duplicate"
			row.Message = "มีคนลงชื่อนี้ไปก่อนระหว่างการนำเข้า"
			summary["duplicate"]++
			continue
		}

		row.LeadID = lead.ID
		row.Status = "created"
		summary["created"]++

		if err := s.OwnershipLogStore.Create(&models.OwnershipLog{
			LeadID:        lead.ID,
			ChangedBy:     me.ID,
			ToOwnerType:   lead.OwnerType,
			ToOwnerUserID: lead.OwnerUserID,
			Note:          "นำเข้าจาก CSV",
		}); err != nil {
			s.Log.WithError(err).Error("failed to write the ownership log for an imported lead")
		}

		if row.Contact != "" {
			if err := s.ContactStore.Create(&models.Contact{
				LeadID: lead.ID,
				Name:   row.Contact,
			}); err != nil {
				s.Log.WithError(err).Error("failed to create an imported lead's contact")
			}
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"mode":    "commit",
		"summary": summary,
		"rows":    rows,
	})
}

// parseImportCSV reads the CSV into rows, mapping the header names it knows.
func (s *Server) parseImportCSV(r io.Reader) ([]*importRow, error) {
	reader := csv.NewReader(newBOMStripper(r))
	reader.FieldsPerRecord = -1
	reader.TrimLeadingSpace = true

	headers, err := reader.Read()
	if err != nil {
		return nil, errors.New("อ่านหัวตารางของ CSV ไม่ได้")
	}

	columns := make(map[string]int, len(headers))
	for i, raw := range headers {
		key := strings.ToLower(strings.TrimSpace(raw))
		if field, ok := importHeaderAliases[key]; ok {
			if _, exists := columns[field]; !exists {
				columns[field] = i
			}
		}
	}
	if _, ok := columns["name"]; !ok {
		return nil, errors.New("CSV ต้องมีคอลัมน์ชื่อบริษัท (name หรือ ชื่อบริษัท)")
	}

	at := func(record []string, field string) string {
		index, ok := columns[field]
		if !ok || index >= len(record) {
			return ""
		}
		return strings.TrimSpace(record[index])
	}

	rows := make([]*importRow, 0, 64)
	lineNumber := 1
	for {
		record, err := reader.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		lineNumber++
		if err != nil {
			rows = append(rows, &importRow{
				Row: lineNumber, Status: "invalid", Message: "อ่านแถวนี้ไม่ได้",
			})
			continue
		}

		name := at(record, "name")
		row := &importRow{
			Row:          lineNumber,
			Name:         name,
			Industry:     strings.ToLower(at(record, "industry")),
			Source:       strings.ToLower(at(record, "source")),
			SourceDetail: at(record, "source_detail"),
			Website:      at(record, "website"),
			Contact:      at(record, "contact"),
		}
		row.NormalizedName = leadrules.NormalizeName(name)
		if row.NormalizedName == "" {
			row.Status = "invalid"
			row.Message = "ไม่มีชื่อบริษัท"
		}
		rows = append(rows, row)
	}
	return rows, nil
}

func isValidSource(value string) bool {
	for _, s := range models.Sources() {
		if s == value {
			return true
		}
	}
	return false
}

func isValidIndustry(value string) bool {
	for _, s := range models.Industries() {
		if s == value {
			return true
		}
	}
	return false
}

func formUint(c echo.Context, name string) *uint {
	raw := strings.TrimSpace(c.FormValue(name))
	if raw == "" {
		return nil
	}
	value, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || value == 0 {
		return nil
	}
	out := uint(value)
	return &out
}

// bomStripper drops a UTF-8 BOM, which Excel writes in front of Thai CSVs.
type bomStripper struct {
	reader  io.Reader
	checked bool
	buffer  []byte
}

func newBOMStripper(r io.Reader) io.Reader { return &bomStripper{reader: r} }

func (b *bomStripper) Read(p []byte) (int, error) {
	if !b.checked {
		b.checked = true
		head := make([]byte, 3)
		n, err := io.ReadFull(b.reader, head)
		head = head[:n]
		if n == 3 && head[0] == 0xEF && head[1] == 0xBB && head[2] == 0xBF {
			head = nil
		}
		b.buffer = head
		if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) && !errors.Is(err, io.EOF) {
			return 0, err
		}
	}
	if len(b.buffer) > 0 {
		n := copy(p, b.buffer)
		b.buffer = b.buffer[n:]
		return n, nil
	}
	return b.reader.Read(p)
}
