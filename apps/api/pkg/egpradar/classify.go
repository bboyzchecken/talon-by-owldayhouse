package egpradar

import "strings"

// groupRules are checked in order: the first rule whose pattern appears in
// the agency's name wins. Order matters — "องค์การบริหารส่วนจังหวัด" is local
// government and must be caught before the generic state-enterprise rule, and
// "มหาวิทยาลัย" before "วิทยาลัย".
var groupRules = []struct {
	group    string
	patterns []string
}{
	{GroupUniversity, []string{"มหาวิทยาลัย", "สถาบันเทคโนโลยี", "สถาบันบัณฑิต"}},
	{GroupHealth, []string{"โรงพยาบาล", "สาธารณสุข", "ศูนย์อนามัย", "สถาบันบำราศ", "สถาบันประสาท"}},
	{GroupSchool, []string{"โรงเรียน", "วิทยาลัย", "เขตพื้นที่การศึกษา", "อาชีวศึกษา", "ศูนย์การศึกษา", "การศึกษาขั้นพื้นฐาน"}},
	{GroupLocal, []string{"องค์การบริหารส่วน", "เทศบาล", "กรุงเทพมหานคร", "เมืองพัทยา"}},
	{GroupStateEnterprise, []string{"ธนาคาร", "บริษัท", "การไฟฟ้า", "การประปา", "การท่าเรือ", "การรถไฟ", "การท่องเที่ยว", "การกีฬา", "การเคหะ", "องค์การ"}},
	{GroupMinistry, []string{"กระทรวง", "กรม", "สำนักงาน", "สำนัก", "กอง", "ศาล", "สภา", "คณะกรรมการ", "สถาบัน"}},
}

// Classify puts an agency into a group from its name.
func Classify(agency string) string {
	name := strings.TrimSpace(agency)
	for _, rule := range groupRules {
		for _, p := range rule.patterns {
			if strings.Contains(name, p) {
				return rule.group
			}
		}
	}
	return GroupOther
}

// IndustryFor maps an agency group onto the Lead Tracker industry.
func IndustryFor(group string) string {
	switch group {
	case GroupUniversity, GroupSchool:
		return "education"
	case GroupHealth:
		return "healthcare"
	default:
		return "other"
	}
}

// GroupLabel is the Thai label for a group.
func GroupLabel(group string) string {
	switch group {
	case GroupUniversity:
		return "มหาวิทยาลัย"
	case GroupSchool:
		return "โรงเรียน / วิทยาลัย"
	case GroupHealth:
		return "โรงพยาบาล / สาธารณสุข"
	case GroupMinistry:
		return "กระทรวง / กรม"
	case GroupLocal:
		return "ท้องถิ่น"
	case GroupStateEnterprise:
		return "รัฐวิสาหกิจ / ธนาคารรัฐ"
	default:
		return "อื่น ๆ"
	}
}
