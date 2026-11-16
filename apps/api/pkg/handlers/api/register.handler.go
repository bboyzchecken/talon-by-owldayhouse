package api

import (
	"errors"
	"net/http"
	"regexp"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/shopspring/decimal"

	"github.com/owldayhouse/odh-internal-api/pkg/handlers/api/request"
	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// The registers of the document tool (step 4): billing contacts, products and
// payment methods. Codes and type numbers follow PEAK so the accounting
// firm's PEAK can be matched later (docs/internal-tools/document-system.md).
//
// Who may do what:
//   - Contacts: an admin, anything. A sales account adds and edits customers
//     tied to a lead it owns, and sees only those. Vendors are the admin's.
//   - Products and payment methods: everyone reads the active ones (the
//     document form needs them); only an admin adds or changes them.

func (s *Server) registerRegisterRoutes(docs *echo.Group) {
	docs.GET("/contacts", s.ListBillingContacts)
	docs.POST("/contacts", s.CreateBillingContact)
	docs.GET("/contacts/from-lead", s.BillingContactFromLead)
	docs.GET("/contacts/:cid", s.GetBillingContact)
	docs.PUT("/contacts/:cid", s.UpdateBillingContact)
	docs.DELETE("/contacts/:cid", s.DeleteBillingContact)

	docs.GET("/products", s.ListProducts)
	docs.POST("/products", s.CreateProduct, s.IsAdmin())
	docs.PUT("/products/:pid", s.UpdateProduct, s.IsAdmin())

	docs.GET("/payment-methods", s.ListPaymentMethods)
	docs.POST("/payment-methods", s.CreatePaymentMethod, s.IsAdmin())
	docs.PUT("/payment-methods/:mid", s.UpdatePaymentMethod, s.IsAdmin())
}

func (s *Server) registerError(c echo.Context, err error) error {
	var rule ruleViolation
	switch {
	case errors.As(err, &rule):
		return c.JSON(http.StatusUnprocessableEntity, errorBody(rule.Error()))
	case errors.Is(err, models.ErrCodeTaken), errors.Is(err, models.ErrRegisterInUse):
		return conflict(c, errorBody(err.Error()))
	case isNotFound(err):
		return notFound(c, "ไม่พบรายการนี้")
	}
	return s.serverError(c, err)
}

// --- contacts --------------------------------------------------------------------

type billingContactBody struct {
	Code            string `json:"code"`
	Name            string `json:"name"`
	ContactType     int    `json:"contact_type"`
	NamePrefix      int    `json:"name_prefix"`
	FinanceSide     string `json:"finance_side"`
	WhtForm         string `json:"wht_form"`
	TaxNumber       string `json:"tax_number"`
	BranchCode      string `json:"branch_code"`
	Address         string `json:"address"`
	SubDistrict     string `json:"sub_district"`
	District        string `json:"district"`
	Province        string `json:"province"`
	PostCode        string `json:"post_code"`
	Country         string `json:"country"`
	PersonFirstName string `json:"person_first_name"`
	PersonLastName  string `json:"person_last_name"`
	PersonPosition  string `json:"person_position"`
	PersonPhone     string `json:"person_phone"`
	PersonEmail     string `json:"person_email"`
	LeadID          *uint  `json:"lead_id"`
}

var (
	codePattern  = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._/-]{0,31}$`)
	branchDigits = regexp.MustCompile(`^\d{5}$`)
	notDigit     = regexp.MustCompile(`\D`)
)

// applyContact checks a body and copies it onto contact.
func applyContact(contact *models.BillingContact, body billingContactBody) error {
	contact.Name = cut(body.Name, 255)
	if contact.Name == "" {
		return violation("ใส่ชื่อผู้ติดต่อ")
	}
	if code := strings.TrimSpace(body.Code); code != "" {
		if !codePattern.MatchString(code) {
			return violation("รหัสใช้ได้เฉพาะตัวอักษรอังกฤษ ตัวเลข และ - . / _ ไม่เกิน 32 ตัว")
		}
		contact.Code = code
	}
	if body.ContactType < models.ContactLimitedPartnership || body.ContactType > models.ContactJointVenture {
		return violation("ประเภทผู้ติดต่อไม่ถูกต้อง")
	}
	contact.ContactType = body.ContactType
	if body.NamePrefix < 0 || body.NamePrefix > 5 {
		return violation("คำนำหน้าชื่อไม่ถูกต้อง")
	}
	contact.NamePrefix = body.NamePrefix
	if contact.ContactType != models.ContactPerson {
		contact.NamePrefix = 0
	}

	switch body.FinanceSide {
	case models.FinanceCustomer, models.FinanceVendor, models.FinanceBoth:
		contact.FinanceSide = body.FinanceSide
	case "":
		contact.FinanceSide = models.FinanceCustomer
	default:
		return violation("ฝั่งของผู้ติดต่อไม่ถูกต้อง")
	}
	switch body.WhtForm {
	case models.WhtFormPND3, models.WhtFormPND53:
		contact.WhtForm = body.WhtForm
	case "":
		contact.WhtForm = models.DefaultWhtForm(contact.ContactType)
	default:
		return violation("แบบภาษีหัก ณ ที่จ่ายต้องเป็น ภ.ง.ด.3 หรือ ภ.ง.ด.53")
	}

	contact.TaxNumber = notDigit.ReplaceAllString(body.TaxNumber, "")
	if contact.TaxNumber != "" && len(contact.TaxNumber) != 13 {
		return violation("เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก")
	}
	contact.BranchCode = strings.TrimSpace(body.BranchCode)
	if contact.BranchCode == "" {
		contact.BranchCode = "00000"
	}
	if !branchDigits.MatchString(contact.BranchCode) {
		return violation("รหัสสาขาต้องเป็นตัวเลข 5 หลัก (สำนักงานใหญ่ = 00000)")
	}

	contact.Address = cut(body.Address, 500)
	contact.SubDistrict = cut(body.SubDistrict, 100)
	contact.District = cut(body.District, 100)
	contact.Province = cut(body.Province, 100)
	contact.PostCode = cut(body.PostCode, 10)
	contact.Country = cut(body.Country, 100)
	if contact.Country == "" {
		contact.Country = "Thailand"
	}
	contact.PersonFirstName = cut(body.PersonFirstName, 100)
	contact.PersonLastName = cut(body.PersonLastName, 100)
	contact.PersonPosition = cut(body.PersonPosition, 100)
	contact.PersonPhone = cut(body.PersonPhone, 40)
	contact.PersonEmail = cut(body.PersonEmail, 200)
	if contact.PersonEmail != "" && !strings.Contains(contact.PersonEmail, "@") {
		return violation("อีเมลไม่ถูกต้อง")
	}
	contact.LeadID = body.LeadID
	if contact.LeadID != nil && *contact.LeadID == 0 {
		contact.LeadID = nil
	}
	return nil
}

// canWorkOnContact: an admin always; a sales account only on a customer tied
// to a lead it owns.
func (s *Server) canWorkOnContact(me leadrules.Actor, side string, leadID *uint) (bool, error) {
	if me.IsAdmin() {
		return true, nil
	}
	if side != models.FinanceCustomer {
		return false, nil
	}
	owner, err := s.leadOwner(leadID)
	if err != nil {
		return false, err
	}
	return owner != nil && *owner == me.ID, nil
}

const noContactAccess = "ผู้ติดต่อนี้ต้องให้แอดมิน หรือเซลส์ที่ดูแลลูกค้ารายนี้เป็นคนจัดการ"

func (s *Server) checkLead(leadID *uint) error {
	if leadID == nil {
		return nil
	}
	if _, err := s.LeadStore.Find(*leadID); err != nil {
		if isNotFound(err) {
			return violation("ไม่พบลูกค้าใน Lead Tracker ที่เลือก")
		}
		return err
	}
	return nil
}

// ListBillingContacts handles GET /api/docs/contacts?search=&side=&lead_id=&page=.
func (s *Server) ListBillingContacts(c echo.Context) error {
	me := actor(c)
	filter := models.ContactFilter{Search: c.QueryParam("search"), Side: c.QueryParam("side")}
	if id := request.QueryUint(c, "lead_id"); id != nil {
		filter.LeadID = *id
	}
	if p := request.QueryUint(c, "page"); p != nil {
		filter.Page = int(*p)
	}
	if l := request.QueryUint(c, "limit"); l != nil {
		filter.Limit = int(*l)
	}
	if !me.IsAdmin() {
		filter.OwnerUserID = &me.ID
	}
	rows, total, err := s.RegisterStore.ListContacts(filter)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"items": rows, "total": total})
}

func (s *Server) loadContact(c echo.Context) (*models.BillingContact, error) {
	id, err := request.UintParam(c, "cid")
	if err != nil {
		return nil, badRequest(c, "รหัสผู้ติดต่อไม่ถูกต้อง")
	}
	contact, err := s.RegisterStore.FindContact(id)
	if err != nil {
		if isNotFound(err) {
			return nil, notFound(c, "ไม่พบผู้ติดต่อนี้")
		}
		return nil, s.serverError(c, err)
	}
	me := actor(c)
	if !me.IsAdmin() {
		owner, err := s.leadOwner(contact.LeadID)
		if err != nil {
			return nil, s.serverError(c, err)
		}
		if owner == nil || *owner != me.ID {
			return nil, notFound(c, "ไม่พบผู้ติดต่อนี้")
		}
	}
	return contact, nil
}

// GetBillingContact handles GET /api/docs/contacts/:cid.
func (s *Server) GetBillingContact(c echo.Context) error {
	contact, err := s.loadContact(c)
	if contact == nil {
		return err
	}
	return c.JSON(http.StatusOK, contact)
}

// CreateBillingContact handles POST /api/docs/contacts. Without a code the
// contact gets the next C-0001 (customer) or V-0001 (vendor); a code given
// is kept, so the codes the accounting firm uses in PEAK can carry over.
func (s *Server) CreateBillingContact(c echo.Context) error {
	var body billingContactBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	contact := &models.BillingContact{}
	if err := applyContact(contact, body); err != nil {
		return s.registerError(c, err)
	}
	if err := s.checkLead(contact.LeadID); err != nil {
		return s.registerError(c, err)
	}
	me := actor(c)
	ok, err := s.canWorkOnContact(me, contact.FinanceSide, contact.LeadID)
	if err != nil {
		return s.serverError(c, err)
	}
	if !ok {
		return forbidden(c, noContactAccess)
	}
	contact.CreatedBy = me.ID
	if err := s.RegisterStore.CreateContact(contact); err != nil {
		return s.registerError(c, err)
	}
	return c.JSON(http.StatusCreated, contact)
}

// UpdateBillingContact handles PUT /api/docs/contacts/:cid. An issued
// document is not affected: it keeps the buyer's name, address, tax ID and
// branch as they were when it was issued (documents.buyer_*). The change
// shows on drafts and on documents issued from now on.
func (s *Server) UpdateBillingContact(c echo.Context) error {
	current, err := s.loadContact(c)
	if current == nil {
		return err
	}
	var body billingContactBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	updated := *current
	if strings.TrimSpace(body.Code) == "" {
		body.Code = current.Code
	}
	if err := applyContact(&updated, body); err != nil {
		return s.registerError(c, err)
	}
	if err := s.checkLead(updated.LeadID); err != nil {
		return s.registerError(c, err)
	}
	me := actor(c)
	for _, check := range []struct {
		side string
		lead *uint
	}{{current.FinanceSide, current.LeadID}, {updated.FinanceSide, updated.LeadID}} {
		ok, err := s.canWorkOnContact(me, check.side, check.lead)
		if err != nil {
			return s.serverError(c, err)
		}
		if !ok {
			return forbidden(c, noContactAccess)
		}
	}
	if err := s.RegisterStore.UpdateContact(&updated); err != nil {
		return s.registerError(c, err)
	}
	return c.JSON(http.StatusOK, updated)
}

// DeleteBillingContact handles DELETE /api/docs/contacts/:cid: only a
// contact no document uses.
func (s *Server) DeleteBillingContact(c echo.Context) error {
	contact, err := s.loadContact(c)
	if contact == nil {
		return err
	}
	ok, err := s.canWorkOnContact(actor(c), contact.FinanceSide, contact.LeadID)
	if err != nil {
		return s.serverError(c, err)
	}
	if !ok {
		return forbidden(c, noContactAccess)
	}
	if err := s.RegisterStore.DeleteContact(contact.ID); err != nil {
		return s.registerError(c, err)
	}
	return c.NoContent(http.StatusNoContent)
}

// BillingContactFromLead handles GET /api/docs/contacts/from-lead?lead_id=:
// a contact filled in from a Lead Tracker customer and its first contact
// person, for the person to complete. Nothing is saved.
func (s *Server) BillingContactFromLead(c echo.Context) error {
	leadID := request.QueryUint(c, "lead_id")
	if leadID == nil {
		return badRequest(c, "ต้องระบุลูกค้า")
	}
	lead, err := s.LeadStore.Find(*leadID)
	if err != nil {
		if isNotFound(err) {
			return notFound(c, "ไม่พบลูกค้ารายนี้")
		}
		return s.serverError(c, err)
	}
	me := actor(c)
	if !me.IsAdmin() && (lead.OwnerUserID == nil || *lead.OwnerUserID != me.ID) {
		return notFound(c, "ไม่พบลูกค้ารายนี้")
	}
	draft := models.BillingContact{
		Name:        lead.Name,
		ContactType: models.ContactCompany,
		FinanceSide: models.FinanceCustomer,
		WhtForm:     models.WhtFormPND53,
		BranchCode:  "00000",
		Country:     "Thailand",
		LeadID:      &lead.ID,
	}
	if lead.TaxID != nil {
		draft.TaxNumber = *lead.TaxID
	}
	people, err := s.ContactStore.ListByLead(lead.ID)
	if err != nil {
		return s.serverError(c, err)
	}
	if len(people) > 0 {
		first, last, _ := strings.Cut(strings.TrimSpace(people[0].Name), " ")
		draft.PersonFirstName = first
		draft.PersonLastName = strings.TrimSpace(last)
		draft.PersonPosition = people[0].Position
		draft.PersonPhone = people[0].Phone
		draft.PersonEmail = people[0].Email
	}
	return c.JSON(http.StatusOK, draft)
}

// --- products ------------------------------------------------------------------

type productBody struct {
	Code        string          `json:"code"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	ProductType int             `json:"product_type"`
	UnitName    string          `json:"unit_name"`
	SellPrice   decimal.Decimal `json:"sell_price"`
	SellVatType int             `json:"sell_vat_type"`
	Interest    string          `json:"interest"`
	Active      *bool           `json:"active"`
}

func applyProduct(product *models.Product, body productBody) error {
	product.Code = strings.TrimSpace(body.Code)
	if !codePattern.MatchString(product.Code) {
		return violation("รหัสสินค้า/บริการใช้ได้เฉพาะตัวอักษรอังกฤษ ตัวเลข และ - . / _ ไม่เกิน 32 ตัว")
	}
	product.Name = cut(body.Name, 255)
	if product.Name == "" {
		return violation("ใส่ชื่อสินค้า/บริการ")
	}
	product.Description = cut(body.Description, 1000)
	switch body.ProductType {
	case 1, 2:
		product.ProductType = body.ProductType
	case 0:
		product.ProductType = 2
	default:
		return violation("ประเภทต้องเป็นสินค้าหรือบริการ")
	}
	product.UnitName = cut(body.UnitName, 50)
	if body.SellPrice.IsNegative() {
		return violation("ราคาติดลบไม่ได้")
	}
	product.SellPrice = body.SellPrice.Round(2)
	switch body.SellVatType {
	case models.VatNone, models.VatZero, models.VatSeven:
		product.SellVatType = body.SellVatType
	case 0:
		product.SellVatType = models.VatSeven
	default:
		return violation("ประเภท VAT ไม่ถูกต้อง")
	}
	product.Interest = ""
	if body.Interest != "" {
		for _, v := range models.Interests() {
			if v == body.Interest {
				product.Interest = v
			}
		}
		if product.Interest == "" {
			return violation("บริการที่ผูกไม่ถูกต้อง")
		}
	}
	if body.Active != nil {
		product.Active = *body.Active
	}
	return nil
}

// ListProducts handles GET /api/docs/products?search=&all=1 (all: an admin
// sees inactive ones too).
func (s *Server) ListProducts(c echo.Context) error {
	all := c.QueryParam("all") == "1" && actor(c).IsAdmin()
	rows, err := s.RegisterStore.ListProducts(c.QueryParam("search"), all, 200)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"items": rows})
}

// CreateProduct handles POST /api/docs/products (admin).
func (s *Server) CreateProduct(c echo.Context) error {
	var body productBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	product := &models.Product{Active: true}
	if err := applyProduct(product, body); err != nil {
		return s.registerError(c, err)
	}
	if err := s.RegisterStore.CreateProduct(product); err != nil {
		return s.registerError(c, err)
	}
	return c.JSON(http.StatusCreated, product)
}

// UpdateProduct handles PUT /api/docs/products/:pid (admin). A product is
// switched off, not deleted: documents keep pointing at it.
func (s *Server) UpdateProduct(c echo.Context) error {
	id, err := request.UintParam(c, "pid")
	if err != nil {
		return badRequest(c, "รหัสสินค้าไม่ถูกต้อง")
	}
	product, err := s.RegisterStore.FindProduct(id)
	if err != nil {
		return s.registerError(c, err)
	}
	var body productBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := applyProduct(product, body); err != nil {
		return s.registerError(c, err)
	}
	if err := s.RegisterStore.UpdateProduct(product); err != nil {
		return s.registerError(c, err)
	}
	return c.JSON(http.StatusOK, product)
}

// --- payment methods -----------------------------------------------------------

type paymentMethodBody struct {
	Code       string `json:"code"`
	Name       string `json:"name"`
	MethodType int    `json:"method_type"`
	BankName   string `json:"bank_name"`
	AccountNo  string `json:"account_no"`
	Active     *bool  `json:"active"`
}

func applyPaymentMethod(method *models.PaymentMethod, body paymentMethodBody) error {
	method.Code = strings.TrimSpace(body.Code)
	if !codePattern.MatchString(method.Code) {
		return violation("รหัสใช้ได้เฉพาะตัวอักษรอังกฤษ ตัวเลข และ - . / _ ไม่เกิน 32 ตัว")
	}
	method.Name = cut(body.Name, 200)
	if method.Name == "" {
		return violation("ใส่ชื่อช่องทาง เช่น บัญชีกสิกรไทย ออมทรัพย์")
	}
	switch body.MethodType {
	case models.PayMethodCash, models.PayMethodBank, models.PayMethodEWallet:
		method.MethodType = body.MethodType
	default:
		return violation("ประเภทต้องเป็นเงินสด บัญชีธนาคาร หรือ e-Wallet")
	}
	method.BankName = cut(body.BankName, 100)
	method.AccountNo = cut(body.AccountNo, 40)
	if method.MethodType == models.PayMethodBank && (method.BankName == "" || method.AccountNo == "") {
		return violation("บัญชีธนาคารต้องมีชื่อธนาคารและเลขที่บัญชี")
	}
	if body.Active != nil {
		method.Active = *body.Active
	}
	return nil
}

// ListPaymentMethods handles GET /api/docs/payment-methods?all=1.
func (s *Server) ListPaymentMethods(c echo.Context) error {
	all := c.QueryParam("all") == "1" && actor(c).IsAdmin()
	rows, err := s.RegisterStore.ListPaymentMethods(all)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"items": rows})
}

// CreatePaymentMethod handles POST /api/docs/payment-methods (admin).
func (s *Server) CreatePaymentMethod(c echo.Context) error {
	var body paymentMethodBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	method := &models.PaymentMethod{Active: true}
	if err := applyPaymentMethod(method, body); err != nil {
		return s.registerError(c, err)
	}
	if err := s.RegisterStore.CreatePaymentMethod(method); err != nil {
		return s.registerError(c, err)
	}
	return c.JSON(http.StatusCreated, method)
}

// UpdatePaymentMethod handles PUT /api/docs/payment-methods/:mid (admin).
func (s *Server) UpdatePaymentMethod(c echo.Context) error {
	id, err := request.UintParam(c, "mid")
	if err != nil {
		return badRequest(c, "รหัสไม่ถูกต้อง")
	}
	method, err := s.RegisterStore.FindPaymentMethod(id)
	if err != nil {
		return s.registerError(c, err)
	}
	var body paymentMethodBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := applyPaymentMethod(method, body); err != nil {
		return s.registerError(c, err)
	}
	if err := s.RegisterStore.UpdatePaymentMethod(method); err != nil {
		return s.registerError(c, err)
	}
	return c.JSON(http.StatusOK, method)
}
