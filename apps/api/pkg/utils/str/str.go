// Package str holds small string helpers.
package str

import "strings"

// Trim is strings.TrimSpace, named for symmetry with the other helpers.
func Trim(s string) string { return strings.TrimSpace(s) }

// Truncate shortens s to at most n runes, appending "…" when it had to cut.
func Truncate(s string, n int) string {
	runes := []rune(s)
	if n <= 0 || len(runes) <= n {
		return s
	}
	return string(runes[:n]) + "…"
}

// Coalesce returns the first non-empty string.
func Coalesce(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

// Deref returns the value behind p, or "" when p is nil.
func Deref(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

// PtrOrNil returns a pointer to s, or nil when s is empty after trimming.
func PtrOrNil(s string) *string {
	trimmed := strings.TrimSpace(s)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
