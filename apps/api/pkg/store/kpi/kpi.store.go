// Package kpi computes the sales scorecards straight from leads, activities and
// deals, keeping the company / sales_existing split throughout.
package kpi

import (
	"github.com/owldayhouse/odh-internal-api/pkg/models"
	"go.uber.org/fx"
	"gorm.io/gorm"
)

type kpiStoreService struct {
	db *gorm.DB
}

// New builds the KPI repository.
func New(db *gorm.DB) models.KPIStore {
	return &kpiStoreService{db: db}
}

// Module is the FX wiring for this repository.
var Module = fx.Module("store.kpi", fx.Provide(New))

// ownerSplitRow is "one user, one owner_type, one number".
type ownerSplitRow struct {
	UserID    uint
	OwnerType string
	Count     int64
	Amount    float64
}

// activityRow adds the activity type to the split.
type activityRow struct {
	UserID    uint
	OwnerType string
	Type      string
	Count     int64
}

// sourceRow is one row of the "which source pays off" table.
type sourceRow struct {
	Source string
	Count  int64
	Amount float64
}

// Compute builds the whole KPI payload for the period.
//
// Attribution, deliberately:
//   - new leads and won revenue follow the lead's owner (owner_user_id), so a
//     reassignment moves the credit with the customer;
//   - meetings and proposals follow the person who did the work
//     (activities.user_id), while the company / sales_existing split still
//     comes from the lead that was worked on.
func (s *kpiStoreService) Compute(
	query models.KPIQuery,
	period models.KPIPeriod,
	users []*models.User,
	targets []*models.Target,
) (*models.KPIResult, error) {
	result := &models.KPIResult{
		Period:   period,
		Users:    make([]*models.KPIUserResult, 0, len(users)),
		BySource: make([]*models.KPISourceConversion, 0, len(models.Sources())),
	}

	index := make(map[uint]*models.KPIUserResult, len(users))
	for _, u := range users {
		row := &models.KPIUserResult{UserID: u.ID, Username: u.Username, Name: u.Name}
		index[u.ID] = row
		result.Users = append(result.Users, row)
	}

	split := func(row *models.KPIUserResult, ownerType string) *models.KPISplit {
		if ownerType == models.OwnerTypeSalesExisting {
			return &row.SalesExisting
		}
		return &row.Company
	}

	// 1. New leads, by owner and owner type.
	var leadRows []ownerSplitRow
	leadQ := s.db.Model(&models.Lead{}).
		Select("owner_user_id AS user_id, owner_type, COUNT(*) AS count").
		Where("owner_user_id IS NOT NULL").
		Where("registered_at >= ? AND registered_at < ?", period.From, period.To).
		Group("owner_user_id, owner_type")
	if query.UserID != nil {
		leadQ = leadQ.Where("owner_user_id = ?", *query.UserID)
	}
	if err := leadQ.Scan(&leadRows).Error; err != nil {
		return nil, err
	}
	for _, r := range leadRows {
		if row, ok := index[r.UserID]; ok {
			split(row, r.OwnerType).NewLeads += r.Count
		}
	}

	// 2. Meetings and proposals, by the person who did them.
	var actRows []activityRow
	actQ := s.db.Table("activities a").
		Select("a.user_id AS user_id, l.owner_type AS owner_type, a.type AS type, COUNT(*) AS count").
		Joins("JOIN leads l ON l.id = a.lead_id").
		Where("a.type IN ?", []string{models.ActivityMeeting, models.ActivityProposalSent}).
		Where("a.happened_at >= ? AND a.happened_at < ?", period.From, period.To).
		Group("a.user_id, l.owner_type, a.type")
	if query.UserID != nil {
		actQ = actQ.Where("a.user_id = ?", *query.UserID)
	}
	if err := actQ.Scan(&actRows).Error; err != nil {
		return nil, err
	}
	for _, r := range actRows {
		row, ok := index[r.UserID]
		if !ok {
			continue
		}
		target := split(row, r.OwnerType)
		if r.Type == models.ActivityMeeting {
			target.Meetings += r.Count
		} else {
			target.Proposals += r.Count
		}
	}

	// 3. Won deals, by the owner of the lead they belong to.
	var dealRows []ownerSplitRow
	dealQ := s.db.Table("deals d").
		Select("l.owner_user_id AS user_id, l.owner_type AS owner_type, COUNT(*) AS count, COALESCE(SUM(d.amount), 0) AS amount").
		Joins("JOIN leads l ON l.id = d.lead_id").
		Where("l.owner_user_id IS NOT NULL").
		Where("d.won_at >= ? AND d.won_at < ?", period.From, period.To).
		Group("l.owner_user_id, l.owner_type")
	if query.UserID != nil {
		dealQ = dealQ.Where("l.owner_user_id = ?", *query.UserID)
	}
	if err := dealQ.Scan(&dealRows).Error; err != nil {
		return nil, err
	}
	for _, r := range dealRows {
		if row, ok := index[r.UserID]; ok {
			target := split(row, r.OwnerType)
			target.WonCount += r.Count
			target.WonAmount += r.Amount
		}
	}

	// 4. Totals, targets and the team row.
	targetIndex := make(map[uint]*models.Target, len(targets))
	for _, t := range targets {
		targetIndex[t.UserID] = t
	}
	factor := 1.0
	if period.Month > 0 {
		factor = 1.0 / 3.0 // a month is a third of the quarterly target
	}

	for _, row := range result.Users {
		row.Total = models.KPISplit{}
		row.Total.Add(row.Company)
		row.Total.Add(row.SalesExisting)

		if t, ok := targetIndex[row.UserID]; ok {
			row.Target = buildTarget(t, factor, row)
		}

		result.Team.Company.Add(row.Company)
		result.Team.SalesExisting.Add(row.SalesExisting)
	}
	result.Team.Name = "ทีมขายรวม"
	result.Team.Total.Add(result.Team.Company)
	result.Team.Total.Add(result.Team.SalesExisting)

	// 5. Conversion by source.
	bySource, err := s.conversionBySource(query, period)
	if err != nil {
		return nil, err
	}
	result.BySource = bySource

	return result, nil
}

// buildTarget pro-rates the quarterly target to the period and measures the
// main KPI against it. Existing-customer revenue is reported separately as a
// bonus so it can never fill the company quota.
func buildTarget(t *models.Target, factor float64, row *models.KPIUserResult) *models.KPITarget {
	revenue := t.RevenueTarget * factor
	proposals := float64(t.ProposalsTarget) * factor
	meetings := float64(t.MeetingsTarget) * factor

	out := &models.KPITarget{
		RevenueTarget:   round2(revenue),
		ProposalsTarget: int(roundHalf(proposals)),
		MeetingsTarget:  int(roundHalf(meetings)),
		BonusRevenue:    row.SalesExisting.WonAmount,
	}
	out.RevenuePercent = percent(row.Company.WonAmount, revenue)
	out.ProposalsPercent = percent(float64(row.Company.Proposals), proposals)
	out.MeetingsPercent = percent(float64(row.Company.Meetings), meetings)
	out.BonusRevenuePct = percent(row.SalesExisting.WonAmount, revenue)
	return out
}

func (s *kpiStoreService) conversionBySource(
	query models.KPIQuery,
	period models.KPIPeriod,
) ([]*models.KPISourceConversion, error) {
	index := make(map[string]*models.KPISourceConversion, len(models.Sources()))
	order := make([]*models.KPISourceConversion, 0, len(models.Sources()))
	get := func(source string) *models.KPISourceConversion {
		if row, ok := index[source]; ok {
			return row
		}
		row := &models.KPISourceConversion{Source: source}
		index[source] = row
		order = append(order, row)
		return row
	}

	// New leads per source.
	var leadRows []sourceRow
	leadQ := s.db.Model(&models.Lead{}).
		Select("source, COUNT(*) AS count").
		Where("registered_at >= ? AND registered_at < ?", period.From, period.To).
		Group("source")
	if query.UserID != nil {
		leadQ = leadQ.Where("owner_user_id = ?", *query.UserID)
	}
	if err := leadQ.Scan(&leadRows).Error; err != nil {
		return nil, err
	}
	for _, r := range leadRows {
		get(r.Source).NewLeads = r.Count
	}

	// Meetings and proposals per source.
	for _, kind := range []string{models.ActivityMeeting, models.ActivityProposalSent} {
		var rows []sourceRow
		q := s.db.Table("activities a").
			Select("l.source AS source, COUNT(DISTINCT a.lead_id) AS count").
			Joins("JOIN leads l ON l.id = a.lead_id").
			Where("a.type = ?", kind).
			Where("a.happened_at >= ? AND a.happened_at < ?", period.From, period.To).
			Group("l.source")
		if query.UserID != nil {
			q = q.Where("a.user_id = ?", *query.UserID)
		}
		if err := q.Scan(&rows).Error; err != nil {
			return nil, err
		}
		for _, r := range rows {
			if kind == models.ActivityMeeting {
				get(r.Source).Meetings = r.Count
			} else {
				get(r.Source).Proposals = r.Count
			}
		}
	}

	// Won deals per source.
	var dealRows []sourceRow
	dealQ := s.db.Table("deals d").
		Select("l.source AS source, COUNT(*) AS count, COALESCE(SUM(d.amount), 0) AS amount").
		Joins("JOIN leads l ON l.id = d.lead_id").
		Where("d.won_at >= ? AND d.won_at < ?", period.From, period.To).
		Group("l.source")
	if query.UserID != nil {
		dealQ = dealQ.Where("l.owner_user_id = ?", *query.UserID)
	}
	if err := dealQ.Scan(&dealRows).Error; err != nil {
		return nil, err
	}
	for _, r := range dealRows {
		row := get(r.Source)
		row.WonCount = r.Count
		row.WonAmount = r.Amount
	}

	for _, row := range order {
		row.MeetingRate = percent(float64(row.Meetings), float64(row.NewLeads))
		row.WonRate = percent(float64(row.WonCount), float64(row.NewLeads))
	}
	return order, nil
}

// StageCounts powers the pipeline board header.
func (s *kpiStoreService) StageCounts(userID *uint) (map[string]int64, error) {
	type row struct {
		Stage string
		Count int64
	}
	q := s.db.Model(&models.Lead{}).Select("stage, COUNT(*) AS count").Group("stage")
	if userID != nil {
		q = q.Where("owner_user_id = ?", *userID)
	}

	var rows []row
	if err := q.Scan(&rows).Error; err != nil {
		return nil, err
	}

	counts := make(map[string]int64, len(models.Stages()))
	for _, stage := range models.Stages() {
		counts[stage] = 0
	}
	for _, r := range rows {
		counts[r.Stage] = r.Count
	}
	return counts, nil
}

func percent(value, target float64) float64 {
	if target <= 0 {
		return 0
	}
	return round2(value / target * 100)
}

func round2(v float64) float64 {
	return float64(int64(v*100+sign(v)*0.5)) / 100
}

func roundHalf(v float64) float64 {
	return float64(int64(v + sign(v)*0.5))
}

func sign(v float64) float64 {
	if v < 0 {
		return -1
	}
	return 1
}
