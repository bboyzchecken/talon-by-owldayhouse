// Package dateutil holds the date-range helpers the KPI and Today screens need.
// Every window is computed in Asia/Bangkok.
package dateutil

import "time"

// StartOfDay truncates to midnight in t's own location.
func StartOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

// StartOfWeek returns the Monday of t's week.
func StartOfWeek(t time.Time) time.Time {
	day := StartOfDay(t)
	offset := (int(day.Weekday()) + 6) % 7 // Monday = 0
	return day.AddDate(0, 0, -offset)
}

// StartOfMonth returns the first day of t's month.
func StartOfMonth(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
}

// MonthRange returns [from, to) for one calendar month.
func MonthRange(year, month int, loc *time.Location) (time.Time, time.Time) {
	from := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, loc)
	return from, from.AddDate(0, 1, 0)
}

// QuarterRange returns [from, to) for one calendar quarter (1-4).
func QuarterRange(year, quarter int, loc *time.Location) (time.Time, time.Time) {
	if quarter < 1 || quarter > 4 {
		quarter = 1
	}
	from := time.Date(year, time.Month((quarter-1)*3+1), 1, 0, 0, 0, 0, loc)
	return from, from.AddDate(0, 3, 0)
}

// YearRange returns [from, to) for one calendar year.
func YearRange(year int, loc *time.Location) (time.Time, time.Time) {
	from := time.Date(year, time.January, 1, 0, 0, 0, 0, loc)
	return from, from.AddDate(1, 0, 0)
}

// InTimeSpan reports whether check falls inside [start, end).
func InTimeSpan(start, end, check time.Time) bool {
	return !check.Before(start) && check.Before(end)
}
