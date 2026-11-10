package egpradar

import (
	"strings"
	"unicode/utf8"
)

// A Thai procurement title reads "<method><verb><what is hired><purpose>":
//
//	จ้างเหมาบริการรถโดยสารไม่ประจำทางไปกลับ เพื่อเข้าร่วมอบรมโครงการ…
//	└── what is hired: a bus ──────────┘ └── purpose: a training ──┘
//
// Matching a service keyword anywhere in the title sends a bus hire to the
// inbox because its purpose mentions อบรม. Subject cuts the purpose off, so
// keywords and excluded words are matched against what is actually hired.

// purposeMarkers start the purpose part of a title wherever they appear.
var purposeMarkers = []string{
	"เพื่อ", "สำหรับ", "ใช้ใน", "ใช้สำหรับ", "ในการ", "ประกอบการ", "เข้าร่วม",
	"ตามโครงการ", "ภายใต้โครงการ", "ในโครงการ", "ของโครงการ", "ตามแผน",
	"ไปกลับ", "ไป-กลับ", "ไป - กลับ", "เดินทาง", "รับ-ส่ง", "รับ - ส่ง", "รับส่ง",
	"ให้กับ", "ให้แก่", "ประจำเดือน", "โดยวิธี", "ด้วยวิธี",
}

// softMarkers start the purpose only when something is hired before them:
// "จ้างเหมารถโครงการห้องเรียน…" is a car for a project, but
// "จ้างจัดโครงการอบรม…" and "ประกวดราคาจ้างโครงการ ชลบุรี คอฟฟี่…" hire the
// project itself.
var softMarkers = []string{"โครงการ", "กิจกรรม", "ไป"}

// leadingWords are the method and verb words a title starts with. They are
// skipped only to see whether anything is hired before a soft marker.
var leadingWords = []string{
	"ประกวดราคา", "สอบราคา", "คัดเลือก", "จ้างเหมา", "จัดจ้าง", "จัดซื้อ",
	"จ้าง", "เหมา", "ซื้อ", "เช่า", "บริการ",
}

// genericSubjects say nothing about the work ("hire a consultant to…"), so
// the purpose is the work and the whole title counts.
var genericSubjects = map[string]bool{
	"": true, "ดำเนินการ": true, "ดำเนินงาน": true, "ที่ปรึกษา": true,
	"บุคคลภายนอก": true, "บุคคล": true, "เอกชน": true, "บริษัท": true,
	"ค่าใช้จ่าย": true,
}

// Subject returns the lower-cased part of a title that names what is hired.
func Subject(title string) string {
	t := strings.ToLower(strings.TrimSpace(title))
	cut := len(t)

	for _, m := range purposeMarkers {
		if i := strings.Index(t, m); i > 0 && i < cut {
			cut = i
		}
	}
	for _, m := range softMarkers {
		from := 0
		for {
			i := strings.Index(t[from:], m)
			if i < 0 {
				break
			}
			i += from
			from = i + len(m)
			if i >= cut {
				break
			}
			if m == "ไป" && strings.HasPrefix(t[i:], "ไปรษณีย์") {
				continue
			}
			before := core(t[:i])
			if before == "" || strings.HasSuffix(before, "จัด") || strings.HasSuffix(before, "ดำเนิน") {
				continue
			}
			cut = i
			break
		}
	}

	subject := strings.TrimSpace(t[:cut])
	if genericSubjects[core(subject)] {
		return t
	}
	return subject
}

// core strips the method and verb words from the start of a title fragment.
func core(s string) string {
	s = strings.TrimSpace(s)
	for {
		trimmed := false
		for _, w := range leadingWords {
			if strings.HasPrefix(s, w) {
				s = strings.TrimSpace(s[len(w):])
				trimmed = true
			}
		}
		if !trimmed {
			return s
		}
	}
}

// shorten keeps a subject readable in an exclusion reason.
func shorten(s string, runes int) string {
	if utf8.RuneCountInString(s) <= runes {
		return s
	}
	r := []rune(s)
	return string(r[:runes]) + "…"
}
