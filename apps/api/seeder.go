package main

import (
	"flag"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/owldayhouse/odh-internal-api/pkg/core"
	"github.com/owldayhouse/odh-internal-api/pkg/database"
	"github.com/owldayhouse/odh-internal-api/pkg/handlers/api/request"
	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/logger"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
	storeuser "github.com/owldayhouse/odh-internal-api/pkg/store/user"
	"gorm.io/gorm"
)

// openDB is the shared setup for every CLI command: connect and migrate.
func openDB(config core.Config) *gorm.DB {
	log := logger.New(config.Environment)
	db, err := database.New(config, log)
	if err != nil {
		log.WithError(err).Fatal("cannot connect to PostgreSQL")
	}
	if err := database.Migrate(db); err != nil {
		log.WithError(err).Fatal("migrations failed")
	}
	return db
}

// runSeedAdmin creates the very first admin account. This is the only way an
// account comes into existence without another account: there is no e-mail
// invitation, so the first admin is seeded here and creates the rest.
//
//	go run . seed -username admin -name "ชื่อ นามสกุล" [-password '...']
func runSeedAdmin(config core.Config, args []string) {
	flags := flag.NewFlagSet("seed", flag.ExitOnError)
	username := flags.String("username", "admin", "ชื่อผู้ใช้ของแอดมินคนแรก")
	name := flags.String("name", "ผู้ดูแลระบบ", "ชื่อที่แสดงของแอดมิน")
	password := flags.String("password", "", "รหัสผ่าน (เว้นว่างเพื่อให้สุ่มให้)")
	if err := flags.Parse(args); err != nil {
		log.Fatal(err)
	}

	db := openDB(config)
	users := storeuser.New(db)

	normalized := strings.ToLower(strings.TrimSpace(*username))
	if existing, err := users.FindByUsername(normalized); err == nil {
		fmt.Printf("บัญชี %q มีอยู่แล้ว (id=%d, role=%s) — ไม่สร้างซ้ำ\n",
			existing.Username, existing.ID, existing.Role)
		fmt.Println("ถ้าต้องการรีเซ็ตรหัสผ่าน ใช้หน้า Admin ในระบบ หรือคำสั่ง create-user สำหรับบัญชีใหม่")
		return
	}

	plain := *password
	generated := false
	if plain == "" {
		var err error
		if plain, err = request.GeneratePassword(14); err != nil {
			log.Fatal(err)
		}
		generated = true
	}
	hash, err := request.HashPassword(plain)
	if err != nil {
		log.Fatal(err)
	}

	admin := &models.User{
		Username: normalized,
		Name:     strings.TrimSpace(*name),
		Password: hash,
		Role:     models.RoleAdmin,
		Status:   models.StatusActive,
	}
	if err := users.Create(admin); err != nil {
		log.Fatalf("cannot create the admin account: %v", err)
	}

	fmt.Printf("สร้างแอดมินแล้ว: %s (id=%d)\n", admin.Username, admin.ID)
	if generated {
		fmt.Printf("รหัสผ่าน: %s\n", plain)
		fmt.Println("เก็บรหัสนี้ไว้ให้ดี ระบบไม่แสดงอีกและไม่มีการส่งอีเมล")
	}
}

// runCreateUser creates any account from the CLI — handy for the first three
// sales accounts before anyone logs in.
//
//	go run . create-user -username somchai -name "สมชาย ..." -role sales
func runCreateUser(config core.Config, args []string) {
	flags := flag.NewFlagSet("create-user", flag.ExitOnError)
	username := flags.String("username", "", "ชื่อผู้ใช้")
	name := flags.String("name", "", "ชื่อที่แสดง")
	role := flags.String("role", models.RoleSales, "admin หรือ sales")
	password := flags.String("password", "", "รหัสผ่าน (เว้นว่างเพื่อให้สุ่มให้)")
	if err := flags.Parse(args); err != nil {
		log.Fatal(err)
	}
	if strings.TrimSpace(*username) == "" || strings.TrimSpace(*name) == "" {
		log.Fatal("ต้องระบุทั้ง -username และ -name")
	}
	if *role != models.RoleAdmin && *role != models.RoleSales {
		log.Fatalf("role ต้องเป็น %s หรือ %s", models.RoleAdmin, models.RoleSales)
	}

	db := openDB(config)
	users := storeuser.New(db)

	normalized := strings.ToLower(strings.TrimSpace(*username))
	if existing, err := users.FindByUsername(normalized); err == nil {
		log.Fatalf("บัญชี %q มีอยู่แล้ว (id=%d)", existing.Username, existing.ID)
	}

	plain := *password
	generated := false
	if plain == "" {
		var err error
		if plain, err = request.GeneratePassword(12); err != nil {
			log.Fatal(err)
		}
		generated = true
	}
	hash, err := request.HashPassword(plain)
	if err != nil {
		log.Fatal(err)
	}

	user := &models.User{
		Username: normalized,
		Name:     strings.TrimSpace(*name),
		Password: hash,
		Role:     *role,
		Status:   models.StatusActive,
	}
	if err := users.Create(user); err != nil {
		log.Fatalf("cannot create the account: %v", err)
	}

	fmt.Printf("สร้างบัญชีแล้ว: %s (%s, id=%d)\n", user.Username, user.Role, user.ID)
	if generated {
		fmt.Printf("รหัสผ่าน: %s\n", plain)
	}
}

// runSeedDemo loads a handful of leads so the KPI and pipeline screens have
// something to show while developing. It refuses to run in production.
func runSeedDemo(config core.Config) {
	if config.Environment == "production" {
		log.Fatal("seed-demo ใช้ใน production ไม่ได้")
	}

	db := openDB(config)
	users := storeuser.New(db)

	admin, err := users.FindByUsername("admin")
	if err != nil {
		log.Fatal("ยังไม่มีบัญชี admin — รัน `seed` ก่อน")
	}

	salesAccounts := make([]*models.User, 0, 3)
	for i := 1; i <= 3; i++ {
		username := fmt.Sprintf("sales%d", i)
		user, err := users.FindByUsername(username)
		if err != nil {
			hash, hashErr := request.HashPassword("demo-password-1234")
			if hashErr != nil {
				log.Fatal(hashErr)
			}
			user = &models.User{
				Username: username,
				Name:     fmt.Sprintf("เซลส์ตัวอย่าง %d", i),
				Password: hash,
				Role:     models.RoleSales,
				Status:   models.StatusActive,
			}
			if createErr := users.Create(user); createErr != nil {
				log.Fatal(createErr)
			}
		}
		salesAccounts = append(salesAccounts, user)
	}

	now := time.Now().In(leadrules.Bangkok)
	demo := []struct {
		Name      string
		Industry  string
		Source    string
		OwnerType string
		Stage     string
		Owner     int
	}{
		{"บริษัท สถาบันติวเตอร์ไทย จำกัด", models.IndustryEducation, models.SourceTradeFair, models.OwnerTypeCompany, models.StageMeeting, 0},
		{"บริษัท บ้านสวยพร็อพเพอร์ตี้ จำกัด", models.IndustryPropertyAuto, models.SourceEGP, models.OwnerTypeCompany, models.StageProposal, 1},
		{"บริษัท คลินิกผิวดีเวชกรรม จำกัด", models.IndustryHealthcare, models.SourceAdLibrary, models.OwnerTypeCompany, models.StageNew, 2},
		{"บริษัท ร้านกาแฟเก่าแก่ จำกัด", models.IndustryOther, models.SourceSalesExisting, models.OwnerTypeSalesExisting, models.StageWon, 0},
	}

	created := 0
	for _, row := range demo {
		normalized := leadrules.NormalizeName(row.Name)
		var count int64
		if err := db.Model(&models.Lead{}).Where("normalized_name = ?", normalized).Count(&count).Error; err != nil {
			log.Fatal(err)
		}
		if count > 0 {
			continue
		}

		owner := salesAccounts[row.Owner]
		nextAction := now.AddDate(0, 0, created-1)
		lead := &models.Lead{
			Name:           row.Name,
			NormalizedName: normalized,
			Industry:       row.Industry,
			Source:         row.Source,
			SourceDetail:   "ข้อมูลตัวอย่างสำหรับทดสอบ",
			OwnerType:      row.OwnerType,
			OwnerUserID:    &owner.ID,
			RegisteredBy:   admin.ID,
			RegisteredAt:   now.AddDate(0, 0, -7),
			Stage:          row.Stage,
			EstimatedValue: 150000,
			NextAction:     "โทรติดตาม",
			NextActionDate: &nextAction,
		}
		if err := db.Create(lead).Error; err != nil {
			log.Fatal(err)
		}

		if err := db.Create(&models.Activity{
			LeadID:     lead.ID,
			UserID:     owner.ID,
			Type:       models.ActivityMeeting,
			HappenedAt: now.AddDate(0, 0, -3),
			Summary:    "คุยความต้องการเบื้องต้น",
		}).Error; err != nil {
			log.Fatal(err)
		}

		if row.Stage == models.StageWon {
			if err := db.Create(&models.Deal{
				LeadID:    lead.ID,
				Service:   models.InterestEvent,
				Amount:    250000,
				WonAt:     now.AddDate(0, 0, -1),
				CreatedBy: admin.ID,
			}).Error; err != nil {
				log.Fatal(err)
			}
		}
		created++
	}

	fmt.Printf("สร้างข้อมูลตัวอย่างแล้ว %d ราย (บัญชีเซลส์ตัวอย่าง: sales1-3 / demo-password-1234)\n", created)
}
