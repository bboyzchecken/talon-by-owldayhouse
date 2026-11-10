package egpradar

import (
	"regexp"
	"strings"
)

// Procurement methods, recognised from the project title.
const (
	MethodEBidding  = "e-bidding"
	MethodEMarket   = "e-market"
	MethodSelection = "selection"
	MethodSpecific  = "specific"
	MethodUnknown   = ""
)

var (
	projectIDPattern = regexp.MustCompile(`\(?\s*เลขที่โครงการ\s*:?\s*(\d{6,})\s*\)?`)
	spacePattern     = regexp.MustCompile(`\s+`)
)

// ParsedTitle is what can be read out of an e-GP project title, which reads
// like "ประกวดราคาจ้าง… ด้วยวิธีประกวดราคาอิเล็กทรอนิกส์ (e-bidding)
// (เลขที่โครงการ : 69109061081)".
type ParsedTitle struct {
	Title     string
	ProjectID string
	Method    string
	// Hire is true for procurements that hire someone (จ้าง), false for
	// purchases of goods (ซื้อ).
	Hire bool
}

// ParseTitle pulls the project number and method out of a title and returns
// the title without the trailing project number.
func ParseTitle(raw string) ParsedTitle {
	text := spacePattern.ReplaceAllString(strings.TrimSpace(raw), " ")

	out := ParsedTitle{}
	if m := projectIDPattern.FindStringSubmatch(text); m != nil {
		out.ProjectID = m[1]
		text = strings.TrimSpace(projectIDPattern.ReplaceAllString(text, ""))
	}
	out.Title = text
	out.Method = MethodOf(text)
	out.Hire = strings.Contains(text, "จ้าง")
	return out
}

// MethodOf recognises the procurement method named in a title or a method
// column.
func MethodOf(text string) string {
	lower := strings.ToLower(text)
	switch {
	case strings.Contains(lower, "e-bidding") || strings.Contains(text, "ประกวดราคาอิเล็กทรอนิกส์"):
		return MethodEBidding
	case strings.Contains(lower, "e-market") || strings.Contains(text, "ตลาดอิเล็กทรอนิกส์"):
		return MethodEMarket
	case strings.Contains(text, "เฉพาะเจาะจง"):
		return MethodSpecific
	case strings.Contains(text, "คัดเลือก"):
		return MethodSelection
	default:
		return MethodUnknown
	}
}

// MethodLabel is the Thai label for a method.
func MethodLabel(method string) string {
	switch method {
	case MethodEBidding:
		return "e-bidding"
	case MethodEMarket:
		return "e-market"
	case MethodSelection:
		return "คัดเลือก"
	case MethodSpecific:
		return "เฉพาะเจาะจง"
	default:
		return "ไม่ระบุ"
	}
}

// shortTitleTails are the method phrases e-GP appends to a title.
var shortTitleTails = []string{"ด้วยวิธี", "โดยวิธี"}

// ShortTitle is a title trimmed for a card: without e-GP's method words at
// the start ("ประกวดราคา") and the end ("ด้วยวิธีประกวดราคาอิเล็กทรอนิกส์
// (e-bidding)"), the doubled "จ้างจ้าง", and cut to maxRunes.
func ShortTitle(title string, maxRunes int) string {
	t := spacePattern.ReplaceAllString(strings.TrimSpace(title), " ")
	for _, prefix := range []string{"ประกวดราคา", "สอบราคา"} {
		if rest := strings.TrimSpace(strings.TrimPrefix(t, prefix)); rest != t && rest != "" {
			t = rest
			break
		}
	}
	for strings.HasPrefix(t, "จ้างจ้าง") || strings.HasPrefix(t, "ซื้อซื้อ") {
		t = t[len("จ้าง"):]
		if strings.HasPrefix(t, "ซื้อ") && !strings.HasPrefix(t, "ซื้อซื้อ") {
			break
		}
	}
	for _, tail := range shortTitleTails {
		if i := strings.Index(t, tail); i > 0 {
			t = strings.TrimSpace(t[:i])
		}
	}
	if r := []rune(t); maxRunes > 0 && len(r) > maxRunes {
		t = strings.TrimSpace(string(r[:maxRunes])) + "…"
	}
	return t
}
