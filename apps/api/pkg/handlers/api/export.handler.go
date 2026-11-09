package api

import (
	"encoding/csv"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/owldayhouse/odh-internal-api/pkg/handlers/api/request"
	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// exportColumns is the CSV header, in Thai because the file is opened in Excel.
var exportColumns = []string{
	"id", "ชื่อบริษัท", "เลขผู้เสียภาษี", "เว็บไซต์", "กลุ่มธุรกิจ",
	"แหล่งที่มา", "รายละเอียดแหล่งที่มา", "utm_source", "utm_campaign",
	"ประเภทเจ้าของ", "เซลส์ที่ดูแล", "ขั้น", "เหตุผลที่แพ้",
	"บริการที่สนใจ", "มูลค่าที่คาด", "สิ่งที่ต้องทำต่อ", "วันที่ต้องทำต่อ",
	"ห้ามเสนอขายตรง", "เหตุผลห้ามเสนอขายตรง", "ลงทะเบียนเมื่อ",
}

// ExportLeads streams the lead list as CSV for Excel (admin only). The same
// filters as the list endpoint apply, so an admin can export one view.
func (s *Server) ExportLeads(c echo.Context) error {
	query := models.ListLeadQuery{
		OwnerUserID: request.QueryUint(c, "owner_user_id"),
		OwnerType:   c.QueryParam("owner_type"),
		Stage:       c.QueryParam("stage"),
		Industry:    c.QueryParam("industry"),
		Source:      c.QueryParam("source"),
		Search:      strings.TrimSpace(c.QueryParam("search")),
		Sort:        c.QueryParam("sort"),
		Today:       startOfToday(),
	}

	leads, err := s.LeadStore.ListAll(query)
	if err != nil {
		return s.serverError(c, err)
	}

	filename := "odh-leads-" + time.Now().In(leadrules.Bangkok).Format("20060102-1504") + ".csv"
	c.Response().Header().Set(echo.HeaderContentType, "text/csv; charset=utf-8")
	c.Response().Header().Set(echo.HeaderContentDisposition, `attachment; filename="`+filename+`"`)
	c.Response().WriteHeader(http.StatusOK)

	// Excel needs the BOM to read a UTF-8 CSV with Thai text.
	if _, err := c.Response().Write([]byte{0xEF, 0xBB, 0xBF}); err != nil {
		return err
	}

	writer := csv.NewWriter(c.Response())
	if err := writer.Write(exportColumns); err != nil {
		return err
	}

	for _, lead := range leads {
		owner := ""
		if lead.Owner != nil {
			owner = lead.Owner.Name
		}
		nextActionDate := ""
		if lead.NextActionDate != nil {
			nextActionDate = lead.NextActionDate.In(leadrules.Bangkok).Format("2006-01-02")
		}
		taxID := ""
		if lead.TaxID != nil {
			taxID = *lead.TaxID
		}
		doNotPitch := "ไม่"
		if lead.DoNotPitch {
			doNotPitch = "ใช่"
		}

		record := []string{
			strconv.FormatUint(uint64(lead.ID), 10),
			lead.Name,
			taxID,
			lead.Website,
			lead.Industry,
			lead.Source,
			lead.SourceDetail,
			lead.UTMSource,
			lead.UTMCampaign,
			lead.OwnerType,
			owner,
			lead.Stage,
			lead.LostReason,
			strings.Join(lead.Interests, ", "),
			strconv.FormatFloat(lead.EstimatedValue, 'f', 2, 64),
			lead.NextAction,
			nextActionDate,
			doNotPitch,
			lead.DoNotPitchReason,
			lead.RegisteredAt.In(leadrules.Bangkok).Format("2006-01-02 15:04"),
		}
		if err := writer.Write(record); err != nil {
			return err
		}
	}

	writer.Flush()
	return writer.Error()
}
