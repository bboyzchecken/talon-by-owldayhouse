// Package inbound is the repository for requests that arrive from the public
// quote form.
//
// The intake service uses Create only: its PostgreSQL role has INSERT on
// inbound_requests and nothing else, so the read and write methods below fail
// for it by design. They are there for the CRM, which runs as a signed-in
// person with the usual role.
package inbound

import (
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
func (s *inboundStoreService) Create(row *models.InboundRequest) error {
	return s.db.Create(row).Error
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

// Update saves a row an admin has acted on. Requests are never deleted: a
// discarded one keeps its text and its reason, which is what makes a flood of
// spam readable after the fact.
func (s *inboundStoreService) Update(row *models.InboundRequest) error {
	return s.db.Save(row).Error
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
