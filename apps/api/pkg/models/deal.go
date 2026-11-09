package models

import "time"

// Deal is money won on a lead, recorded when the stage moves to `won`.
// Amount is Thai baht, excluding VAT.
type Deal struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	LeadID    uint      `gorm:"not null;index" json:"lead_id"`
	Lead      *Lead     `gorm:"foreignKey:LeadID" json:"lead,omitempty"`
	Service   string    `gorm:"size:64;not null" json:"service"`
	Amount    float64   `gorm:"type:numeric(14,2);not null;default:0" json:"amount"`
	WonAt     time.Time `gorm:"not null;index" json:"won_at"`
	CreatedBy uint      `gorm:"not null;index" json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// DealStore is the data access contract for deals.
type DealStore interface {
	Create(deal *Deal) error
	Find(id uint) (*Deal, error)
	ListByLead(leadID uint) ([]*Deal, error)
	Delete(id uint) error
}
