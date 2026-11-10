// Package lead is the Lead Tracker's customer repository.
package lead

import (
	"fmt"

	"github.com/owldayhouse/odh-internal-api/pkg/models"
	"github.com/owldayhouse/odh-internal-api/pkg/store"
	"go.uber.org/fx"
	"gorm.io/gorm"
)

type leadStoreService struct {
	db *gorm.DB
}

// New builds the lead repository.
func New(db *gorm.DB) models.LeadStore {
	return &leadStoreService{db: db}
}

// Module is the FX wiring for this repository.
var Module = fx.Module("store.lead", fx.Provide(New))

func (s *leadStoreService) Create(lead *models.Lead) error {
	return s.db.Create(lead).Error
}

func (s *leadStoreService) Find(id uint) (*models.Lead, error) {
	var row models.Lead
	if err := s.db.First(&row, id).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func (s *leadStoreService) FindWithRelations(id uint) (*models.Lead, error) {
	var row models.Lead
	err := s.db.
		Preload("Owner").
		Preload("Registrar").
		Preload("Contacts", func(db *gorm.DB) *gorm.DB { return db.Order("created_at ASC") }).
		First(&row, id).Error
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (s *leadStoreService) FindByNormalizedName(normalized string) (*models.Lead, error) {
	var row models.Lead
	err := s.db.Preload("Owner").Preload("Registrar").
		Where("normalized_name = ?", normalized).First(&row).Error
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (s *leadStoreService) FindByTaxID(taxID string) (*models.Lead, error) {
	var row models.Lead
	err := s.db.Preload("Owner").Preload("Registrar").
		Where("tax_id = ?", taxID).First(&row).Error
	if err != nil {
		return nil, err
	}
	return &row, nil
}

// FindSimilar returns leads whose normalized name looks like the given one.
//
// The `%` operator is what lets Postgres use the GIN trigram index, but it
// compares against the session's pg_trgm.similarity_threshold rather than ours,
// so the threshold is set for the duration of one transaction. The explicit
// similarity() in the WHERE clause keeps the result exact either way.
func (s *leadStoreService) FindSimilar(normalized string, threshold float64, limit int) ([]*models.SimilarLead, error) {
	if normalized == "" {
		return []*models.SimilarLead{}, nil
	}
	if limit < 1 {
		limit = 5
	}

	// Clamped so the formatted literal below is always a plain number in range.
	if threshold <= 0 || threshold > 1 {
		threshold = 0.4
	}

	rows := make([]*models.SimilarLead, 0, limit)
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// SET takes no bind parameters, so the (clamped, non-user) threshold is
		// formatted in. SET LOCAL keeps it inside this transaction, so a pooled
		// connection never carries it over to the next query.
		setThreshold := fmt.Sprintf("SET LOCAL pg_trgm.similarity_threshold = %.4f", threshold)
		if err := tx.Exec(setThreshold).Error; err != nil {
			return err
		}
		return tx.Raw(`
			SELECT l.id,
			       l.name,
			       l.owner_type,
			       l.owner_user_id,
			       COALESCE(u.name, '') AS owner_name,
			       l.registered_at,
			       similarity(l.normalized_name, ?) AS similarity
			  FROM leads l
			  LEFT JOIN users u ON u.id = l.owner_user_id
			 WHERE l.normalized_name % ?
			   AND similarity(l.normalized_name, ?) >= ?
			 ORDER BY similarity DESC, l.registered_at ASC
			 LIMIT ?`,
			normalized, normalized, normalized, threshold, limit,
		).Scan(&rows).Error
	})
	return rows, err
}

// filter applies every list filter to a query.
func (s *leadStoreService) filter(q *gorm.DB, query models.ListLeadQuery) *gorm.DB {
	if query.VisibleToUserID != nil {
		q = q.Where("owner_user_id = ?", *query.VisibleToUserID)
	}
	if query.OwnerUserID != nil {
		q = q.Where("owner_user_id = ?", *query.OwnerUserID)
	}
	if query.OwnerType != "" {
		q = q.Where("owner_type = ?", query.OwnerType)
	}
	if query.Stage != "" {
		q = q.Where("stage = ?", query.Stage)
	}
	if query.Industry != "" {
		q = q.Where("industry = ?", query.Industry)
	}
	if query.Source != "" {
		q = q.Where("source = ?", query.Source)
	}
	if query.DoNotPitch != nil {
		q = q.Where("do_not_pitch = ?", *query.DoNotPitch)
	}
	if query.Search != "" {
		like := "%" + query.Search + "%"
		// The source detail, the next action and the timeline carry project
		// titles and e-GP numbers, so "เว็บไซต์" or "69109177935" finds the
		// lead too, including a second project attached to it.
		q = q.Where("leads.name ILIKE ? OR leads.normalized_name ILIKE ? OR COALESCE(leads.tax_id, '') ILIKE ? "+
			"OR leads.source_detail ILIKE ? OR leads.next_action ILIKE ? "+
			"OR EXISTS (SELECT 1 FROM activities a WHERE a.lead_id = leads.id AND a.summary ILIKE ?)",
			like, like, like, like, like, like)
	}
	if query.DueToday {
		endOfDay := query.Today.AddDate(0, 0, 1)
		q = q.Where("next_action_date IS NOT NULL AND next_action_date < ?", endOfDay).
			Where("stage NOT IN ?", []string{models.StageWon, models.StageLost})
	}
	return q
}

func sortOrder(sort string) string {
	switch sort {
	case "name":
		return "name ASC"
	case "next_action":
		return "next_action_date ASC NULLS LAST, updated_at DESC"
	case "value":
		return "estimated_value DESC"
	case "oldest":
		return "registered_at ASC"
	default:
		return "updated_at DESC"
	}
}

func (s *leadStoreService) List(query models.ListLeadQuery) ([]*models.Lead, *store.PaginationResult, error) {
	query.Normalize()

	q := s.filter(s.db.Model(&models.Lead{}), query)

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, nil, err
	}

	var leads []*models.Lead
	err := store.WithPagination(q, &query.PaginationQuery).
		Preload("Owner").Order(sortOrder(query.Sort)).Find(&leads).Error

	return leads, store.NewPaginationResult(total, query.Page, query.Limit), err
}

// ListAll ignores pagination; it backs the admin CSV export and the board.
func (s *leadStoreService) ListAll(query models.ListLeadQuery) ([]*models.Lead, error) {
	var leads []*models.Lead
	err := s.filter(s.db.Model(&models.Lead{}), query).
		Preload("Owner").Order(sortOrder(query.Sort)).Find(&leads).Error
	return leads, err
}

func (s *leadStoreService) Update(lead *models.Lead) error {
	return s.db.Save(lead).Error
}

// Today powers the "วันนี้" screen: what is due (or overdue), what is coming up
// and the meetings already on the calendar.
func (s *leadStoreService) Today(query models.TodayQuery) (*models.TodayResult, error) {
	if query.AheadDays < 1 {
		query.AheadDays = 7
	}
	startOfTomorrow := query.Today.AddDate(0, 0, 1)
	horizon := query.Today.AddDate(0, 0, query.AheadDays+1)

	open := []string{models.StageWon, models.StageLost}
	result := &models.TodayResult{Due: []*models.Lead{}, Upcoming: []*models.Lead{}}

	due := s.db.Model(&models.Lead{}).
		Where("next_action_date IS NOT NULL AND next_action_date < ?", startOfTomorrow).
		Where("stage NOT IN ?", open)
	upcoming := s.db.Model(&models.Lead{}).
		Where("next_action_date >= ? AND next_action_date < ?", startOfTomorrow, horizon).
		Where("stage NOT IN ?", open)

	if query.UserID != nil {
		due = due.Where("owner_user_id = ?", *query.UserID)
		upcoming = upcoming.Where("owner_user_id = ?", *query.UserID)
	}

	if err := due.Preload("Owner").
		Order("next_action_date ASC").Find(&result.Due).Error; err != nil {
		return nil, err
	}
	if err := upcoming.Preload("Owner").
		Order("next_action_date ASC").Find(&result.Upcoming).Error; err != nil {
		return nil, err
	}
	return result, nil
}

// compile-time guard that the repository satisfies the model's contract.
var _ models.LeadStore = (*leadStoreService)(nil)
