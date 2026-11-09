// Package store holds the shared data-access helpers (pagination and friends).
// Per-domain GORM repositories live in pkg/store/<domain>.
package store

import (
	"math"

	"gorm.io/gorm"
)

// Default and maximum page sizes for every list endpoint.
const (
	DefaultLimit = 20
	MaxLimit     = 200
)

// PaginationQuery is embedded in every list query struct.
type PaginationQuery struct {
	Page  int `query:"page"`
	Limit int `query:"limit"`
}

// Normalize clamps the page and limit into sane bounds.
func (q *PaginationQuery) Normalize() {
	if q.Page < 1 {
		q.Page = 1
	}
	if q.Limit < 1 {
		q.Limit = DefaultLimit
	}
	if q.Limit > MaxLimit {
		q.Limit = MaxLimit
	}
}

// PaginationResult is the pagination block every list response carries.
type PaginationResult struct {
	Total       int64 `json:"total"`
	TotalPages  int   `json:"total_pages"`
	CurrentPage int   `json:"current_page"`
	Limit       int   `json:"limit"`
}

// WithPagination applies OFFSET/LIMIT for the given query.
func WithPagination(q *gorm.DB, query *PaginationQuery) *gorm.DB {
	query.Normalize()
	return q.Offset((query.Page - 1) * query.Limit).Limit(query.Limit)
}

// NewPaginationResult builds the pagination block.
func NewPaginationResult(total int64, page, limit int) *PaginationResult {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = DefaultLimit
	}
	totalPages := 0
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(limit)))
	}
	return &PaginationResult{
		Total:       total,
		TotalPages:  totalPages,
		CurrentPage: page,
		Limit:       limit,
	}
}
