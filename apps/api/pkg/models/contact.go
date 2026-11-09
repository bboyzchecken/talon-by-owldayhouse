package models

import "time"

// Contact is a person at the customer company. These rows are personal data
// under the PDPA: they are only ever returned to a signed-in account, and the
// UI exposes a delete button for every contact.
type Contact struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	LeadID    uint      `gorm:"not null;index" json:"lead_id"`
	Name      string    `gorm:"size:128;not null" json:"name"`
	Position  string    `gorm:"size:128" json:"position"`
	Phone     string    `gorm:"size:32" json:"phone"`
	LineID    string    `gorm:"size:64" json:"line_id"`
	Email     string    `gorm:"size:128" json:"email"`
	Note      string    `gorm:"size:512" json:"note"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ContactStore is the data access contract for contacts.
type ContactStore interface {
	Create(contact *Contact) error
	Find(id uint) (*Contact, error)
	ListByLead(leadID uint) ([]*Contact, error)
	Update(contact *Contact) error
	Delete(id uint) error
}
