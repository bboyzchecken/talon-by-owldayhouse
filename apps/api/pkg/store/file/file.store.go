// Package file is the central attachments repository. Bytes live in R2; this
// table only ever holds metadata.
package file

import (
	"github.com/owldayhouse/odh-internal-api/pkg/models"
	"github.com/owldayhouse/odh-internal-api/pkg/store"
	"go.uber.org/fx"
	"gorm.io/gorm"
)

type fileStoreService struct {
	db *gorm.DB
}

// New builds the attachments repository.
func New(db *gorm.DB) models.FileStore {
	return &fileStoreService{db: db}
}

// Module is the FX wiring for this repository.
var Module = fx.Module("store.file", fx.Provide(New))

func (s *fileStoreService) Create(f *models.File) error {
	return s.db.Create(f).Error
}

func (s *fileStoreService) Find(id uint) (*models.File, error) {
	var f models.File
	if err := s.db.Preload("Uploader").First(&f, id).Error; err != nil {
		return nil, err
	}
	return &f, nil
}

func (s *fileStoreService) ListByOwner(ownerType string, ownerID uint) ([]*models.File, error) {
	var files []*models.File
	err := s.db.Preload("Uploader").
		Where("owner_type = ? AND owner_id = ? AND status = ?", ownerType, ownerID, models.FileStatusReady).
		Order("created_at DESC").Find(&files).Error
	return files, err
}

func (s *fileStoreService) List(query models.ListFileQuery) ([]*models.File, *store.PaginationResult, error) {
	query.Normalize()

	q := s.db.Model(&models.File{})
	if query.OwnerType != "" {
		q = q.Where("owner_type = ?", query.OwnerType)
	}
	if query.OwnerID != 0 {
		q = q.Where("owner_id = ?", query.OwnerID)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, nil, err
	}

	var files []*models.File
	err := store.WithPagination(q, &query.PaginationQuery).
		Preload("Uploader").Order("created_at DESC").Find(&files).Error

	return files, store.NewPaginationResult(total, query.Page, query.Limit), err
}

func (s *fileStoreService) Update(f *models.File) error {
	return s.db.Save(f).Error
}

func (s *fileStoreService) Delete(id uint) error {
	return s.db.Delete(&models.File{}, id).Error
}
