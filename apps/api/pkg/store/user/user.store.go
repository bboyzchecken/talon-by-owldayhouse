// Package user is the accounts repository (shared by every internal tool).
package user

import (
	"github.com/owldayhouse/odh-internal-api/pkg/models"
	"github.com/owldayhouse/odh-internal-api/pkg/store"
	"go.uber.org/fx"
	"gorm.io/gorm"
)

type userStoreService struct {
	db *gorm.DB
}

// New builds the accounts repository.
func New(db *gorm.DB) models.UserStore {
	return &userStoreService{db: db}
}

// Module is the FX wiring for this repository.
var Module = fx.Module("store.user", fx.Provide(New))

func (s *userStoreService) Create(user *models.User) error {
	return s.db.Create(user).Error
}

func (s *userStoreService) Find(id uint) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *userStoreService) FindByUsername(username string) (*models.User, error) {
	var user models.User
	if err := s.db.Where("username = ?", username).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *userStoreService) List(query models.ListUserQuery) ([]*models.User, *store.PaginationResult, error) {
	query.Normalize()

	q := s.db.Model(&models.User{})
	if query.Role != "" {
		q = q.Where("role = ?", query.Role)
	}
	if query.Status != "" {
		q = q.Where("status = ?", query.Status)
	}
	if query.Search != "" {
		like := "%" + query.Search + "%"
		q = q.Where("username ILIKE ? OR name ILIKE ?", like, like)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, nil, err
	}

	var users []*models.User
	err := store.WithPagination(q, &query.PaginationQuery).
		Order("role ASC, name ASC").Find(&users).Error

	return users, store.NewPaginationResult(total, query.Page, query.Limit), err
}

func (s *userStoreService) ListAll() ([]*models.User, error) {
	var users []*models.User
	err := s.db.Order("role ASC, name ASC").Find(&users).Error
	return users, err
}

func (s *userStoreService) Update(user *models.User) error {
	return s.db.Save(user).Error
}

func (s *userStoreService) CountAdmins() (int64, error) {
	var count int64
	err := s.db.Model(&models.User{}).
		Where("role = ? AND status = ?", models.RoleAdmin, models.StatusActive).
		Count(&count).Error
	return count, err
}
