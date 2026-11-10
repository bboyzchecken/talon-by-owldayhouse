package egpradar

import (
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"
)

// A follow-on project ("ระยะ 2", "เฟส 2", "ต่อยอด") usually builds on what the
// earlier phase's contractor delivered. It is announced openly as the rules
// require, but an outsider rarely wins it: check the TOR and the earlier
// phase's winner before preparing a bid.

// phasePattern finds "ระยะ 2", "ระยะที่ ๒", "เฟส 3", "phase 2". "ปีที่" is
// left out: in real titles it is a school grade ("มัธยมศึกษาปีที่ 2"), a
// conscript intake or a magazine volume far more often than a phase.
var phasePattern = regexp.MustCompile(`(ระยะ|เฟส|phase)\s*(?:ที่\s*)?([2-9๒-๙]|ii|iii|iv|สอง|สาม|สี่)`)

// continuationWords mark a follow-on project outright. A bare "ต่อยอด" is
// not one: "พัฒนาต่อยอดสินค้าชุมชน" builds on an idea, not on a contractor.
var continuationWords = []string{
	"ต่อยอดระบบ", "ต่อยอดการพัฒนาระบบ", "ต่อยอดแพลตฟอร์ม", "ต่อยอดแอปพลิเคชัน", "ต่อยอดเว็บไซต์",
	"ระยะต่อไป", "โครงการต่อเนื่อง", "งานต่อเนื่อง",
}

// notPhaseWords after the number make it a measure, not a phase: a length of
// time ("ระยะ 2 ปี"), a distance ("ระยะ 5 เมตร") or electrical wiring
// ("1 เฟส 2 สาย", "1 เฟส 5 กิโลวัตต์").
var notPhaseWords = []string{
	"ปี", "เดือน", "วัน", "สัปดาห์", "ชั่วโมง",
	"เมตร", "ม.", "กม", "กิโลเมตร", "ซม", "มม", "km", "m ",
	"สาย", "กิโลวัตต์", "kw", "วัตต์", "โวลต์", "แอมป์",
}

// Continuation reports whether a title names a follow-on phase, and the words
// that say so.
func Continuation(title string) (bool, string) {
	t := strings.ToLower(title)
	for _, w := range continuationWords {
		if strings.Contains(t, w) {
			return true, w
		}
	}
	for _, loc := range phasePattern.FindAllStringIndex(t, -1) {
		match := t[loc[0]:loc[1]]
		before := strings.TrimSpace(t[:loc[0]])
		rest := t[loc[1]:]
		after := strings.TrimSpace(rest)
		// "ระยะ 20" or "ระยะ ๒๐": the number goes on, so it is a measure.
		if r := firstRune(rest); unicode.IsDigit(r) {
			continue
		}
		if hasAnyPrefix(after, notPhaseWords) {
			continue
		}
		// "1 เฟส", "3 เฟส": electrical phases.
		if strings.HasPrefix(match, "เฟส") || strings.HasPrefix(match, "phase") {
			if r := lastRune(before); unicode.IsDigit(r) {
				continue
			}
		}
		return true, strings.TrimSpace(match)
	}
	return false, ""
}

func firstRune(s string) rune {
	r, _ := utf8.DecodeRuneInString(s)
	return r
}

func lastRune(s string) rune {
	r, _ := utf8.DecodeLastRuneInString(s)
	return r
}

func hasAnyPrefix(s string, prefixes []string) bool {
	for _, p := range prefixes {
		if strings.HasPrefix(s, p) {
			return true
		}
	}
	return false
}
