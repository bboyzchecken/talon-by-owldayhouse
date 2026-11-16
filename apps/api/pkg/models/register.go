package models

import "errors"

// The registers behind the document system: billing contacts, products and
// payment methods. Their shapes are in document.go; this is their store.

// ErrRegisterInUse means a row cannot be deleted because documents point at it.
var ErrRegisterInUse = errors.New("มีเอกสารอ้างถึงรายการนี้อยู่ ลบไม่ได้")

// ErrCodeTaken means another row already has this code.
var ErrCodeTaken = errors.New("รหัสนี้มีอยู่แล้ว")

// ContactFilter narrows the contact register.
type ContactFilter struct {
	Search string
	Side   string // customer | vendor: includes "both"
	LeadID uint
	// OwnerUserID limits the list to contacts of leads this person owns.
	OwnerUserID *uint
	Page, Limit int
}

// RegisterStore is the data access contract for the registers.
type RegisterStore interface {
	ListContacts(filter ContactFilter) ([]*BillingContact, int64, error)
	FindContact(id uint) (*BillingContact, error)
	// CreateContact gives the contact the next C-/V- code when it has none.
	CreateContact(contact *BillingContact) error
	UpdateContact(contact *BillingContact) error
	DeleteContact(id uint) error

	ListProducts(search string, includeInactive bool, limit int) ([]*Product, error)
	FindProduct(id uint) (*Product, error)
	CreateProduct(product *Product) error
	UpdateProduct(product *Product) error

	ListPaymentMethods(includeInactive bool) ([]*PaymentMethod, error)
	FindPaymentMethod(id uint) (*PaymentMethod, error)
	CreatePaymentMethod(method *PaymentMethod) error
	UpdatePaymentMethod(method *PaymentMethod) error
}
