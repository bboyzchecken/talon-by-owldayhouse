package models

import (
	"time"

	"github.com/owldayhouse/odh-internal-api/pkg/store"
)

// File owner types. The table is polymorphic on purpose so the next internal
// tool can attach files without a new table.
const (
	FileOwnerLead = "lead"
)

// File upload lifecycle. A row is created when the presigned PUT is handed out
// and flipped to ready once the browser confirms the upload finished.
const (
	FileStatusPending = "pending"
	FileStatusReady   = "ready"
)

// File is the central attachment table. Bytes live in Cloudflare R2 only —
// nothing is written to the Droplet's disk. Key is the R2 object key.
type File struct {
	ID         uint      `gorm:"primarykey" json:"id"`
	OwnerType  string    `gorm:"size:32;not null;index:idx_files_owner" json:"owner_type"`
	OwnerID    uint      `gorm:"not null;index:idx_files_owner" json:"owner_id"`
	Key        string    `gorm:"size:512;uniqueIndex;not null" json:"key"`
	Filename   string    `gorm:"size:255;not null" json:"filename"`
	Mime       string    `gorm:"size:128;not null" json:"mime"`
	Size       int64     `gorm:"not null;default:0" json:"size"`
	Status     string    `gorm:"size:16;not null;default:pending;index" json:"status"`
	UploadedBy uint      `gorm:"not null;index" json:"uploaded_by"`
	Uploader   *User     `gorm:"foreignKey:UploadedBy" json:"uploader,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// FileStore is the data access contract for attachments.
type FileStore interface {
	Create(file *File) error
	Find(id uint) (*File, error)
	ListByOwner(ownerType string, ownerID uint) ([]*File, error)
	List(query ListFileQuery) ([]*File, *store.PaginationResult, error)
	Update(file *File) error
	Delete(id uint) error
}

// ListFileQuery filters attachments.
type ListFileQuery struct {
	store.PaginationQuery
	OwnerType string `query:"owner_type"`
	OwnerID   uint   `query:"owner_id"`
}
