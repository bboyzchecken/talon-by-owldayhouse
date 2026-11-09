// Package models holds every GORM model plus the Store interface for its
// domain, following PROJECT_TEMPLATE.md ("one model file per domain, struct and
// interface together").
package models

import (
	"time"

	"github.com/owldayhouse/odh-internal-api/pkg/store"
)

// Roles. The template's "user" role is "sales" in this system.
const (
	RoleAdmin = "admin"
	RoleSales = "sales"
)

// Account statuses.
const (
	StatusActive      = "active"
	StatusDeactivated = "deactivated"
)

// User is a company account. There is no self-registration and no e-mail in
// this system: the first admin comes from the `seed` CLI, and that admin
// creates the sales accounts and resets their passwords.
//
// LineUserID is reserved for a future LINE Login; nothing uses it yet.
type User struct {
	ID         uint      `gorm:"primarykey" json:"id"`
	Username   string    `gorm:"uniqueIndex;size:64;not null" json:"username"`
	Name       string    `gorm:"size:128;not null" json:"name"`
	Password   string    `gorm:"size:128;not null" json:"-"`
	Role       string    `gorm:"size:16;not null;default:sales;index" json:"role"`
	Status     string    `gorm:"size:16;not null;default:active;index" json:"status"`
	LineUserID *string   `gorm:"size:64;uniqueIndex" json:"line_user_id,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// IsAdmin reports whether the account may act for the company.
func (u *User) IsAdmin() bool { return u.Role == RoleAdmin }

// UserStore is the data access contract for accounts.
type UserStore interface {
	Create(user *User) error
	Find(id uint) (*User, error)
	FindByUsername(username string) (*User, error)
	List(query ListUserQuery) ([]*User, *store.PaginationResult, error)
	ListAll() ([]*User, error)
	Update(user *User) error
	CountAdmins() (int64, error)
}

// ListUserQuery filters the account list (admin only).
type ListUserQuery struct {
	store.PaginationQuery
	Role   string `query:"role"`
	Status string `query:"status"`
	Search string `query:"search"`
}
