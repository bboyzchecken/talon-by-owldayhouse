package api

import (
	"fmt"
	"net/http"
	"strings"
	"testing"

	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// A refused upload must stop at the refusal: no file row, no presigned URL.
func TestUploadToAnotherSalesLeadIsRefusedCompletely(t *testing.T) {
	env := newTestEnv(t)
	lead := leadID(t, env.createLead(env.sales1, map[string]interface{}{"name": "ลูกค้าไฟล์แนบ", "industry": "education", "source": "referral"}))

	r := env.do(env.sales2, http.MethodPost, "/api/files/upload-url", map[string]interface{}{
		"owner_type": models.FileOwnerLead, "owner_id": lead, "filename": "quote.pdf", "size": 1000,
	})
	if r.Status != http.StatusForbidden {
		t.Fatalf("want 403, got %d", r.Status)
	}
	if strings.Contains(r.Raw, "upload_url") || strings.Contains(r.Raw, "X-Amz") {
		t.Fatalf("a refused request must not carry a presigned URL: %s", r.Raw)
	}
	var files int64
	env.db.Model(&models.File{}).Where("owner_type = ? AND owner_id = ?", models.FileOwnerLead, lead).Count(&files)
	if files != 0 {
		t.Fatalf("a refused request created %d file rows", files)
	}
	_ = fmt.Sprint()
}
