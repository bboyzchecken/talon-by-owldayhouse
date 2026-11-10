package egpradar

import "strings"

// Project stages, read from e-GP's สถานะโครงการ and its winner-announced date.
//
// The real export is mostly projects that are already decided: a
// เฉพาะเจาะจง hire only appears in e-GP once it has been awarded, so most rows
// are history, not opportunities. Only "open" and "upcoming" can still be won.
const (
	StageUpcoming  = "upcoming"  // TOR being drafted, purchase request filed
	StageOpen      = "open"      // invitation published: bids accepted
	StageAwarded   = "awarded"   // winner announced / contract signed
	StageCancelled = "cancelled" // project cancelled
	StageUnknown   = "unknown"
)

// StageOf classifies a project from its e-GP status text, and from whether a
// winner-announced date is present.
func StageOf(status string, winnerAnnounced bool) string {
	s := strings.TrimSpace(status)
	switch {
	case strings.Contains(s, "ยกเลิก"):
		return StageCancelled
	case winnerAnnounced,
		strings.Contains(s, "ประกาศผู้ชนะ"),
		strings.Contains(s, "จัดทำสัญญา"),
		strings.Contains(s, "บริหารสัญญา"),
		strings.Contains(s, "อนุมัติสั่งซื้อ"),
		strings.Contains(s, "ลงนามสัญญา"):
		return StageAwarded
	case strings.Contains(s, "เชิญชวน"):
		return StageOpen
	case strings.Contains(s, "TOR"),
		strings.Contains(s, "รายงานขอซื้อ"),
		strings.Contains(s, "รายงานขอจ้าง"),
		strings.Contains(s, "ร่าง"),
		strings.Contains(s, "ราคากลาง"):
		return StageUpcoming
	default:
		return StageUnknown
	}
}

// StageLabel is the Thai label for a stage.
func StageLabel(stage string) string {
	switch stage {
	case StageUpcoming:
		return "ระยะเตรียมการ"
	case StageOpen:
		return "เปิดรับข้อเสนอ"
	case StageAwarded:
		return "ได้ผู้ชนะแล้ว"
	case StageCancelled:
		return "ยกเลิกแล้ว"
	default:
		return "ไม่ทราบสถานะ"
	}
}
