// Package docnumber hands out document numbers: QO-20261100001 and so on.
//
// The four rules from docs/internal-tools/document-system.md:
//
//  1. A number is reserved when a document is issued, not when a draft is
//     made, so an abandoned draft never uses one up.
//  2. It is reserved inside the same transaction that saves the document. The
//     counter row stays locked until that transaction ends, so two people
//     issuing at once cannot get the same number — and if the save fails and
//     the transaction rolls back, the counter rolls back with it, so a failed
//     issue does not leave a gap either.
//  3. A voided document keeps its number; nothing here ever gives one back.
//  4. An issued document is never edited (enforced by the document service).
//
// A tax invoice series may not have gaps or repeats, which is why this is a
// counter row and not MAX(code)+1 or a PostgreSQL sequence (a sequence does
// not roll back).
package docnumber

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// Bangkok is the zone a document date belongs to: a document issued at 00:30
// on 1 December in Bangkok is a December document.
var Bangkok = func() *time.Location {
	if loc, err := time.LoadLocation("Asia/Bangkok"); err == nil {
		return loc
	}
	return time.FixedZone("ICT", 7*60*60)
}()

// ErrNoNumbering means the document type has no numbering row.
var ErrNoNumbering = errors.New("ประเภทเอกสารนี้ยังไม่ได้ตั้งรูปแบบเลขที่")

// ErrSequenceFull means the period has used every number its digits allow.
var ErrSequenceFull = errors.New("เลขที่เอกสารของงวดนี้เต็มแล้ว ต้องเพิ่มจำนวนหลักในรูปแบบเลขที่")

// Period is the counter period a date falls in: "202611" when the type resets
// monthly, "2026" when it resets yearly. The year is the Gregorian one, as in
// PEAK's own numbers.
func Period(reset string, date time.Time) string {
	d := date.In(Bangkok)
	if reset == models.ResetYearly {
		return d.Format("2006")
	}
	return d.Format("200601")
}

// Format builds the printed number.
func Format(rule models.DocumentNumbering, period string, seq int64) (string, error) {
	if seq < 1 {
		return "", fmt.Errorf("sequence must start at 1, got %d", seq)
	}
	digits := rule.Digits
	if digits < 1 {
		digits = 5
	}
	text := strconv.FormatInt(seq, 10)
	if len(text) > digits {
		return "", ErrSequenceFull
	}
	return rule.Prefix + "-" + period + strings.Repeat("0", digits-len(text)) + text, nil
}

func loadRule(tx *gorm.DB, docType int) (models.DocumentNumbering, error) {
	var rule models.DocumentNumbering
	if err := tx.First(&rule, "doc_type = ?", docType).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return rule, ErrNoNumbering
		}
		return rule, err
	}
	return rule, nil
}

// Reserve takes the next number for a document of docType dated date. It
// must be called with the transaction that saves the document: the number
// is only really taken if that transaction commits.
func Reserve(tx *gorm.DB, docType int, date time.Time) (string, error) {
	rule, err := loadRule(tx, docType)
	if err != nil {
		return "", err
	}
	period := Period(rule.Reset, date)

	// Make sure the period's row exists. Two first-of-the-month issues racing
	// here both get through: the loser's insert does nothing.
	if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&models.DocumentCounter{
		DocType: docType, Period: period, NextValue: 1,
	}).Error; err != nil {
		return "", err
	}

	// The UPDATE locks the row until this transaction ends. A second issuer
	// waits here, then reads the value this one left behind.
	var taken int64
	err = tx.Raw(
		`UPDATE document_counters
		    SET next_value = next_value + 1, updated_at = NOW()
		  WHERE doc_type = ? AND period = ?
		  RETURNING next_value - 1`,
		docType, period,
	).Scan(&taken).Error
	if err != nil {
		return "", err
	}
	if taken < 1 {
		return "", fmt.Errorf("document counter for %d/%s returned %d", docType, period, taken)
	}
	return Format(rule, period, taken)
}

// SetNext moves a counter so that the next number issued is next. It is how
// the system starts from the last number the company already used, before it
// took over. It refuses to move a counter backwards: a number already taken
// must never be handed out again.
func SetNext(db *gorm.DB, docType int, period string, next int64, userID uint) error {
	if next < 1 {
		return errors.New("เลขถัดไปต้องเป็น 1 ขึ้นไป")
	}
	return db.Transaction(func(tx *gorm.DB) error {
		rule, err := loadRule(tx, docType)
		if err != nil {
			return err
		}
		if _, err := Format(rule, period, next); err != nil {
			return err
		}
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&models.DocumentCounter{
			DocType: docType, Period: period, NextValue: 1,
		}).Error; err != nil {
			return err
		}

		var counter models.DocumentCounter
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&counter, "doc_type = ? AND period = ?", docType, period).Error; err != nil {
			return err
		}
		if next < counter.NextValue {
			return fmt.Errorf("เลขถัดไปของงวดนี้อยู่ที่ %d แล้ว ย้อนกลับไม่ได้ เพราะเลขที่ออกไปแล้วห้ามใช้ซ้ำ", counter.NextValue)
		}
		if err := tx.Model(&counter).Update("next_value", next).Error; err != nil {
			return err
		}
		return tx.Create(&models.DocumentEvent{
			UserID: userID,
			Action: models.DocEventNumberSet,
			Note:   fmt.Sprintf("ตั้งเลขถัดไปของ %s งวด %s เป็น %d", rule.Prefix, period, next),
		}).Error
	})
}
