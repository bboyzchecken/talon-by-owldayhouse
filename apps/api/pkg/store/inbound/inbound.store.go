// Package inbound is the repository for requests that arrive from the public
// quote form.
//
// The intake service uses Create only: its PostgreSQL role has INSERT on
// inbound_requests and nothing else, so the read and write methods below fail
// for it by design. They are there for the CRM, which runs as a signed-in
// person with the usual role.
package inbound

import (
	"time"

	"github.com/lib/pq"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
	"go.uber.org/fx"
	"gorm.io/gorm"
)

type inboundStoreService struct {
	db *gorm.DB
}

// New builds the inbound request repository.
func New(db *gorm.DB) models.InboundRequestStore {
	return &inboundStoreService{db: db}
}

// Module is the FX wiring for this repository.
var Module = fx.Module("store.inbound", fx.Provide(New))

// Create stores one submission. Nothing else about it is decided here: it
// lands as `new` and waits for a person.
//
// It is a plain INSERT on purpose, not gorm's Create. Gorm appends
// `RETURNING "id"`, and PostgreSQL needs SELECT on a column to return it — a
// privilege the intake role must not have. So the statement names its columns
// and returns nothing, and row.ID stays zero: the intake never needs it.
func (s *inboundStoreService) Create(row *models.InboundRequest) error {
	now := time.Now()
	if row.CreatedAt.IsZero() {
		row.CreatedAt = now
	}
	row.UpdatedAt = now
	if row.Kind == "" {
		row.Kind = models.InboundKindQuote
	}
	if row.Status == "" {
		row.Status = models.InboundStatusNew
	}
	if row.Locale == "" {
		row.Locale = "th"
	}
	if row.Interests == nil {
		row.Interests = pq.StringArray{}
	}

	return s.db.Exec(`INSERT INTO inbound_requests (
			created_at, updated_at, kind, status, locale,
			contact_name, company, industry, phone, line_id, email,
			interests, brief, timeline, budget_band,
			utm_source, utm_campaign, referrer, landing_path,
			ip_hash, user_agent, discard_reason
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '')`,
		row.CreatedAt, row.UpdatedAt, row.Kind, row.Status, row.Locale,
		row.ContactName, row.Company, row.Industry, row.Phone, row.LineID, row.Email,
		row.Interests, row.Brief, row.Timeline, row.BudgetBand,
		row.UTMSource, row.UTMCampaign, row.Referrer, row.LandingPath,
		row.IPHash, row.UserAgent,
	).Error
}

func (s *inboundStoreService) List(filter models.InboundFilter) ([]*models.InboundRequest, int64, error) {
	q := s.db.Model(&models.InboundRequest{})
	if filter.Status != "" {
		q = q.Where("status = ?", filter.Status)
	}
	if filter.Kind != "" {
		q = q.Where("kind = ?", filter.Kind)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	limit := filter.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	page := filter.Page
	if page < 1 {
		page = 1
	}

	var rows []*models.InboundRequest
	err := q.Preload("Lead").Preload("Handler").
		Order("created_at DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&rows).Error
	return rows, total, err
}

func (s *inboundStoreService) Find(id uint) (*models.InboundRequest, error) {
	var row models.InboundRequest
	if err := s.db.Preload("Lead").Preload("Handler").First(&row, id).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

// Update saves a row someone has acted on. A discarded request keeps its
// text and its reason until the retention purge, which is what makes a flood
// of spam readable after the fact.
func (s *inboundStoreService) Update(row *models.InboundRequest) error {
	return s.db.Save(row).Error
}

// MarkHandled moves a request out of `new`, but only if it is still `new`.
// It reports false when someone else got there first, so two people pressing
// "accept" on the same request cannot both succeed.
func (s *inboundStoreService) MarkHandled(row *models.InboundRequest) (bool, error) {
	result := s.db.Model(&models.InboundRequest{}).
		Where("id = ? AND status = ?", row.ID, models.InboundStatusNew).
		Updates(map[string]interface{}{
			"status":         row.Status,
			"lead_id":        row.LeadID,
			"handled_by":     row.HandledBy,
			"handled_at":     row.HandledAt,
			"discard_reason": row.DiscardReason,
			"updated_at":     time.Now(),
		})
	return result.RowsAffected == 1, result.Error
}

// Delete removes one request for good. It is how a request to erase personal
// data is carried out; nothing else deletes a single row.
func (s *inboundStoreService) Delete(id uint) error {
	return s.db.Delete(&models.InboundRequest{}, id).Error
}

// PurgeUnaccepted deletes every request that was never accepted and is older
// than the cut-off. The privacy policy promises this (180 days), so it runs
// on its own rather than waiting for someone to remember. Accepted requests
// stay: their data now belongs to a customer record with its own retention.
func (s *inboundStoreService) PurgeUnaccepted(before time.Time) (int64, error) {
	result := s.db.
		Where("status <> ? AND created_at < ?", models.InboundStatusAccepted, before).
		Delete(&models.InboundRequest{})
	return result.RowsAffected, result.Error
}

// CountByStatus feeds the badge on the CRM menu.
func (s *inboundStoreService) CountByStatus() (map[string]int64, error) {
	type bucket struct {
		Status string
		Total  int64
	}
	var rows []bucket
	err := s.db.Model(&models.InboundRequest{}).
		Select("status, COUNT(*) AS total").
		Group("status").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	counts := make(map[string]int64, len(rows))
	for _, row := range rows {
		counts[row.Status] = row.Total
	}
	return counts, nil
}
