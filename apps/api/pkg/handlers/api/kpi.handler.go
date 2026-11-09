package api

import (
	"fmt"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/owldayhouse/odh-internal-api/pkg/handlers/api/request"
	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
	"github.com/owldayhouse/odh-internal-api/pkg/utils/dateutil"
)

var thaiMonths = [...]string{
	"มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
	"กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
}

// resolvePeriod turns ?year=&quarter=&month= into a concrete window. With
// nothing given it is the current quarter in Asia/Bangkok.
func resolvePeriod(query models.KPIQuery) models.KPIPeriod {
	now := time.Now().In(leadrules.Bangkok)

	year := query.Year
	if year < 2000 || year > 2100 {
		year = now.Year()
	}

	month := query.Month
	quarter := query.Quarter

	switch {
	case month >= 1 && month <= 12:
		from, to := dateutil.MonthRange(year, month, leadrules.Bangkok)
		return models.KPIPeriod{
			Year: year, Quarter: leadrules.QuarterOf(month), Month: month,
			Label: fmt.Sprintf("%s %d", thaiMonths[month-1], year),
			From:  from, To: to,
		}
	case quarter >= 1 && quarter <= 4:
		from, to := dateutil.QuarterRange(year, quarter, leadrules.Bangkok)
		return models.KPIPeriod{
			Year: year, Quarter: quarter,
			Label: fmt.Sprintf("ไตรมาส %d/%d", quarter, year),
			From:  from, To: to,
		}
	case query.Year > 0 && quarter == 0 && month == 0:
		from, to := dateutil.YearRange(year, leadrules.Bangkok)
		return models.KPIPeriod{
			Year: year, Label: fmt.Sprintf("ปี %d", year), From: from, To: to,
		}
	default:
		q := leadrules.QuarterOf(int(now.Month()))
		from, to := dateutil.QuarterRange(year, q, leadrules.Bangkok)
		return models.KPIPeriod{
			Year: year, Quarter: q,
			Label: fmt.Sprintf("ไตรมาส %d/%d", q, year),
			From:  from, To: to,
		}
	}
}

// GetKPI returns the scorecards. A sales account only ever sees its own; an
// admin sees every sales person, or one with ?user_id=.
func (s *Server) GetKPI(c echo.Context) error {
	me := actor(c)
	query := models.KPIQuery{
		Year:    request.QueryInt(c, "year", 0),
		Quarter: request.QueryInt(c, "quarter", 0),
		Month:   request.QueryInt(c, "month", 0),
		UserID:  request.QueryUint(c, "user_id"),
	}
	if !me.IsAdmin() {
		id := me.ID
		query.UserID = &id
	}

	period := resolvePeriod(query)

	all, err := s.UserStore.ListAll()
	if err != nil {
		return s.serverError(c, err)
	}
	// Report on sales accounts; an admin who owns leads is included too.
	users := make([]*models.User, 0, len(all))
	for _, u := range all {
		if query.UserID != nil && u.ID != *query.UserID {
			continue
		}
		users = append(users, u)
	}

	targets, err := s.TargetStore.List(period.Year, period.Quarter)
	if err != nil {
		return s.serverError(c, err)
	}
	targets = withDefaultTargets(targets, users, period)

	result, err := s.KPIStore.Compute(query, period, users, targets)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, result)
}

// ListTargets returns the quarterly targets, filling in the company default for
// any sales account that has none yet.
func (s *Server) ListTargets(c echo.Context) error {
	now := time.Now().In(leadrules.Bangkok)
	year := request.QueryInt(c, "year", now.Year())
	quarter := request.QueryInt(c, "quarter", leadrules.QuarterOf(int(now.Month())))

	rows, err := s.TargetStore.List(year, quarter)
	if err != nil {
		return s.serverError(c, err)
	}
	existing := make(map[uint]*models.Target, len(rows))
	for _, row := range rows {
		existing[row.UserID] = row
	}

	users, err := s.UserStore.ListAll()
	if err != nil {
		return s.serverError(c, err)
	}

	out := make([]*models.Target, 0, len(users))
	for _, u := range users {
		if u.Status != models.StatusActive {
			continue
		}
		if row, ok := existing[u.ID]; ok {
			out = append(out, row)
			continue
		}
		// Defaults are for the sales team; an admin only has a target if one
		// was saved for them deliberately.
		if u.Role != models.RoleSales {
			continue
		}
		// id 0 marks a default the admin has not saved yet.
		out = append(out, &models.Target{
			UserID:          u.ID,
			User:            u,
			Year:            year,
			Quarter:         quarter,
			RevenueTarget:   models.DefaultRevenueTarget,
			ProposalsTarget: models.DefaultProposalsTarget,
			MeetingsTarget:  models.DefaultMeetingsTarget,
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"data":    out,
		"year":    year,
		"quarter": quarter,
		"defaults": map[string]interface{}{
			"revenue_target":   models.DefaultRevenueTarget,
			"proposals_target": models.DefaultProposalsTarget,
			"meetings_target":  models.DefaultMeetingsTarget,
		},
	})
}

type upsertTargetBody struct {
	UserID          uint    `json:"user_id" validate:"required"`
	Year            int     `json:"year" validate:"required,gte=2000,lte=2100"`
	Quarter         int     `json:"quarter" validate:"required,gte=1,lte=4"`
	RevenueTarget   float64 `json:"revenue_target" validate:"gte=0"`
	ProposalsTarget int     `json:"proposals_target" validate:"gte=0"`
	MeetingsTarget  int     `json:"meetings_target" validate:"gte=0"`
}

// UpsertTarget writes one sales person's target for one quarter (admin only).
func (s *Server) UpsertTarget(c echo.Context) error {
	var body upsertTargetBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := c.Validate(&body); err != nil {
		return unprocessable(c, err)
	}

	if _, err := s.UserStore.Find(body.UserID); err != nil {
		if isNotFound(err) {
			return badRequest(c, "ไม่พบผู้ใช้รายนี้")
		}
		return s.serverError(c, err)
	}

	row := &models.Target{
		UserID:          body.UserID,
		Year:            body.Year,
		Quarter:         body.Quarter,
		RevenueTarget:   body.RevenueTarget,
		ProposalsTarget: body.ProposalsTarget,
		MeetingsTarget:  body.MeetingsTarget,
	}
	if err := s.TargetStore.Upsert(row); err != nil {
		return s.serverError(c, err)
	}

	saved, err := s.TargetStore.Find(body.UserID, body.Year, body.Quarter)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, saved)
}

// withDefaultTargets fills in the company's standard quarterly target for every
// sales account that has no saved row, so the KPI always has something to
// measure against. An admin overrides any of them on the Admin screen.
//
// Admin accounts are left alone: they only get a target if one was saved for
// them deliberately.
func withDefaultTargets(
	targets []*models.Target,
	users []*models.User,
	period models.KPIPeriod,
) []*models.Target {
	saved := make(map[uint]bool, len(targets))
	for _, t := range targets {
		saved[t.UserID] = true
	}

	quarter := period.Quarter
	if quarter < 1 || quarter > 4 {
		// A whole-year view has no single quarter; measure against one quarter's
		// worth of target rather than inventing a yearly number.
		quarter = 1
	}

	for _, user := range users {
		if saved[user.ID] || user.Role != models.RoleSales {
			continue
		}
		targets = append(targets, &models.Target{
			UserID:          user.ID,
			Year:            period.Year,
			Quarter:         quarter,
			RevenueTarget:   models.DefaultRevenueTarget,
			ProposalsTarget: models.DefaultProposalsTarget,
			MeetingsTarget:  models.DefaultMeetingsTarget,
		})
	}
	return targets
}
