package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/owldayhouse/odh-internal-api/pkg/handlers/api/request"
	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// checkFileOwner makes sure the owner row exists and the caller may attach to
// it. Every future tool adds its owner_type here.
func (s *Server) checkFileOwner(c echo.Context, ownerType string, ownerID uint) error {
	switch ownerType {
	case models.FileOwnerLead:
		lead, err := s.LeadStore.Find(ownerID)
		if err != nil {
			if isNotFound(err) {
				return notFound(c, "ไม่พบลูกค้ารายนี้")
			}
			return s.serverError(c, err)
		}
		if !leadrules.CanEditLead(actor(c), lead.OwnerUserID) {
			return forbidden(c, leadrules.ErrNotLeadOwner.Error())
		}
		return nil
	default:
		return badRequest(c, "ชนิดเจ้าของไฟล์ไม่ถูกต้อง")
	}
}

// ListFiles returns attachments for one owner.
func (s *Server) ListFiles(c echo.Context) error {
	ownerType := c.QueryParam("owner_type")
	ownerID := request.QueryUint(c, "owner_id")
	if ownerType == "" || ownerID == nil {
		return badRequest(c, "ต้องระบุ owner_type และ owner_id")
	}

	rows, err := s.FileStore.ListByOwner(ownerType, *ownerID)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": rows})
}

// ListLeadFiles is the lead detail screen's attachment list.
func (s *Server) ListLeadFiles(c echo.Context) error {
	lead, errResponse := s.loadLead(c, false)
	if errResponse != nil {
		return errResponse
	}
	rows, err := s.FileStore.ListByOwner(models.FileOwnerLead, lead.ID)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": rows})
}

type uploadURLBody struct {
	OwnerType string `json:"owner_type" validate:"required,oneof=lead"`
	OwnerID   uint   `json:"owner_id" validate:"required"`
	Filename  string `json:"filename" validate:"required,max=255"`
	Size      int64  `json:"size" validate:"required,gt=0"`
}

// CreateUploadURL hands the browser a short-lived presigned PUT straight to R2.
// The API never receives the bytes, and the bucket stays private.
func (s *Server) CreateUploadURL(c echo.Context) error {
	var body uploadURLBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := c.Validate(&body); err != nil {
		return unprocessable(c, err)
	}
	if err := s.checkFileOwner(c, body.OwnerType, body.OwnerID); err != nil {
		return err
	}

	contentType, err := s.Storage.ResolveContentType(body.Filename)
	if err != nil {
		return s.ruleError(c, err)
	}
	if err := s.Storage.CheckSize(body.Size); err != nil {
		return s.ruleError(c, err)
	}

	key := s.Storage.BuildKey(body.OwnerType, body.OwnerID, body.Filename)
	row := &models.File{
		OwnerType:  body.OwnerType,
		OwnerID:    body.OwnerID,
		Key:        key,
		Filename:   strings.TrimSpace(body.Filename),
		Mime:       contentType,
		Size:       0,
		Status:     models.FileStatusPending,
		UploadedBy: actor(c).ID,
	}
	if err := s.FileStore.Create(row); err != nil {
		return s.serverError(c, err)
	}

	url, expiresAt, err := s.Storage.PresignUpload(c.Request().Context(), key, contentType)
	if err != nil {
		return s.serverError(c, err)
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"file":         row,
		"upload_url":   url,
		"method":       http.MethodPut,
		"headers":      map[string]string{"Content-Type": contentType},
		"expires_at":   expiresAt.Format(time.RFC3339),
		"content_type": contentType,
	})
}

// ConfirmUpload is called once the browser's PUT finished. The real size and
// type are read back from R2, so a client cannot lie about either.
func (s *Server) ConfirmUpload(c echo.Context) error {
	id, err := request.UintParam(c, "id")
	if err != nil {
		return badRequest(c, "รหัสไฟล์ไม่ถูกต้อง")
	}

	row, err := s.FileStore.Find(id)
	if err != nil {
		if isNotFound(err) {
			return notFound(c, "ไม่พบไฟล์นี้")
		}
		return s.serverError(c, err)
	}
	if err := s.checkFileOwner(c, row.OwnerType, row.OwnerID); err != nil {
		return err
	}

	size, mime, err := s.Storage.Stat(c.Request().Context(), row.Key)
	if err != nil {
		return badRequest(c, "ยังไม่พบไฟล์ใน R2 — อัปโหลดอีกครั้ง")
	}
	if err := s.Storage.CheckSize(size); err != nil {
		// Over the cap: drop the object so nothing oversized lingers in R2.
		if delErr := s.Storage.Delete(c.Request().Context(), row.Key); delErr != nil {
			s.Log.WithError(delErr).Error("failed to delete an oversized upload from R2")
		}
		if delErr := s.FileStore.Delete(row.ID); delErr != nil {
			s.Log.WithError(delErr).Error("failed to delete the oversized upload's row")
		}
		return s.ruleError(c, err)
	}

	row.Size = size
	if mime != "" {
		row.Mime = mime
	}
	row.Status = models.FileStatusReady
	if err := s.FileStore.Update(row); err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, row)
}

// CreateDownloadURL hands back a short-lived presigned GET. `?inline=1` returns
// a URL without the attachment disposition, for image previews.
func (s *Server) CreateDownloadURL(c echo.Context) error {
	id, err := request.UintParam(c, "id")
	if err != nil {
		return badRequest(c, "รหัสไฟล์ไม่ถูกต้อง")
	}

	row, err := s.FileStore.Find(id)
	if err != nil {
		if isNotFound(err) {
			return notFound(c, "ไม่พบไฟล์นี้")
		}
		return s.serverError(c, err)
	}
	if row.Status != models.FileStatusReady {
		return badRequest(c, "ไฟล์นี้ยังอัปโหลดไม่เสร็จ")
	}

	var (
		url       string
		expiresAt time.Time
	)
	if request.QueryBool(c, "inline") {
		url, expiresAt, err = s.Storage.PresignInline(c.Request().Context(), row.Key)
	} else {
		url, expiresAt, err = s.Storage.PresignDownload(c.Request().Context(), row.Key, row.Filename)
	}
	if err != nil {
		return s.serverError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"download_url": url,
		"expires_at":   expiresAt.Format(time.RFC3339),
		"filename":     row.Filename,
	})
}

// DeleteFile removes the object from R2 and its row.
func (s *Server) DeleteFile(c echo.Context) error {
	id, err := request.UintParam(c, "id")
	if err != nil {
		return badRequest(c, "รหัสไฟล์ไม่ถูกต้อง")
	}

	row, err := s.FileStore.Find(id)
	if err != nil {
		if isNotFound(err) {
			return notFound(c, "ไม่พบไฟล์นี้")
		}
		return s.serverError(c, err)
	}
	if err := s.checkFileOwner(c, row.OwnerType, row.OwnerID); err != nil {
		return err
	}

	if err := s.Storage.Delete(c.Request().Context(), row.Key); err != nil {
		// Losing the row while the object survives is worse than the other way
		// round, so stop here and let the caller retry.
		return s.serverError(c, err)
	}
	if err := s.FileStore.Delete(row.ID); err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]string{"status": "deleted"})
}
