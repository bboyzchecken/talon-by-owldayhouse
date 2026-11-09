package models

import "time"

// OwnershipLog records every change of owner_type or owner_user_id on a lead:
// who changed it, from what to what, and when. Only an admin can trigger one.
type OwnershipLog struct {
	ID              uint      `gorm:"primarykey" json:"id"`
	LeadID          uint      `gorm:"not null;index" json:"lead_id"`
	Lead            *Lead     `gorm:"foreignKey:LeadID" json:"lead,omitempty"`
	ChangedBy       uint      `gorm:"not null;index" json:"changed_by"`
	ChangedByUser   *User     `gorm:"foreignKey:ChangedBy" json:"changed_by_user,omitempty"`
	FromOwnerType   string    `gorm:"size:20" json:"from_owner_type"`
	ToOwnerType     string    `gorm:"size:20" json:"to_owner_type"`
	FromOwnerUserID *uint     `json:"from_owner_user_id,omitempty"`
	ToOwnerUserID   *uint     `json:"to_owner_user_id,omitempty"`
	Note            string    `gorm:"size:512" json:"note"`
	CreatedAt       time.Time `gorm:"index" json:"created_at"`
}

// OwnershipLogStore is the data access contract for the ownership audit trail.
type OwnershipLogStore interface {
	Create(entry *OwnershipLog) error
	ListByLead(leadID uint) ([]*OwnershipLog, error)
	ListRecent(limit int) ([]*OwnershipLog, error)
}
