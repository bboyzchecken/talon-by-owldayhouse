package leadrules

import (
	"errors"
	"testing"
	"time"
)

func bkk(y int, m time.Month, d, hour int) time.Time {
	return time.Date(y, m, d, hour, 0, 0, 0, Bangkok)
}

func uptr(v uint) *uint { return &v }

func cutoff(t *testing.T, value string) time.Time {
	t.Helper()
	c, err := ParseCutoff(value)
	if err != nil {
		t.Fatalf("ParseCutoff(%q): %v", value, err)
	}
	return c
}

func TestParseCutoffIsInclusiveEndOfDay(t *testing.T) {
	c := cutoff(t, "2026-12-31")
	if c.In(Bangkok).Day() != 31 || c.In(Bangkok).Month() != time.December {
		t.Fatalf("cut-off landed on %s", c.In(Bangkok))
	}
	// The last moment of 31 Dec is inside the window, the first of 1 Jan is not.
	if bkk(2026, time.December, 31, 23).After(c) {
		t.Error("23:00 on the cut-off day should still be inside the window")
	}
	if !bkk(2027, time.January, 1, 0).After(c) {
		t.Error("midnight after the cut-off day should be outside the window")
	}
	if _, err := ParseCutoff("31/12/2026"); err == nil {
		t.Error("expected an error for a non ISO date")
	}
}

func TestCanRegisterSalesExistingRespectsCutoff(t *testing.T) {
	c := cutoff(t, "2026-12-31")
	sales := Actor{ID: 7, Role: "sales"}
	admin := Actor{ID: 1, Role: "admin"}

	cases := []struct {
		name  string
		actor Actor
		now   time.Time
		want  bool
	}{
		{"sales well before the cut-off", sales, bkk(2026, time.November, 9, 10), true},
		{"sales on the cut-off day", sales, bkk(2026, time.December, 31, 9), true},
		{"sales at the last minute", sales, bkk(2026, time.December, 31, 23), true},
		{"sales the day after", sales, bkk(2027, time.January, 1, 9), false},
		{"sales much later", sales, bkk(2027, time.June, 1, 9), false},
		{"admin after the cut-off", admin, bkk(2027, time.June, 1, 9), true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := CanRegisterSalesExisting(tc.actor, tc.now, c); got != tc.want {
				t.Fatalf("got %v, want %v", got, tc.want)
			}
		})
	}
}

func TestResolveOwnerOnCreateForSales(t *testing.T) {
	c := cutoff(t, "2026-12-31")
	sales := Actor{ID: 7, Role: "sales"}

	t.Run("company lead is owned by the sales person who registered it", func(t *testing.T) {
		got, err := ResolveOwnerOnCreate(sales, "company", nil, bkk(2026, time.November, 9, 10), c)
		if err != nil {
			t.Fatal(err)
		}
		if got.OwnerType != "company" || got.OwnerUserID == nil || *got.OwnerUserID != 7 {
			t.Fatalf("got %+v", got)
		}
	})

	t.Run("existing customer before the cut-off", func(t *testing.T) {
		got, err := ResolveOwnerOnCreate(sales, "sales_existing", nil, bkk(2026, time.December, 1, 10), c)
		if err != nil {
			t.Fatal(err)
		}
		if got.OwnerType != "sales_existing" || *got.OwnerUserID != 7 {
			t.Fatalf("got %+v", got)
		}
	})

	t.Run("existing customer after the cut-off is refused", func(t *testing.T) {
		_, err := ResolveOwnerOnCreate(sales, "sales_existing", nil, bkk(2027, time.January, 2, 10), c)
		if !errors.Is(err, ErrCutoffPassed) {
			t.Fatalf("got %v, want ErrCutoffPassed", err)
		}
	})

	t.Run("sales cannot register a lead for someone else", func(t *testing.T) {
		_, err := ResolveOwnerOnCreate(sales, "company", uptr(8), bkk(2026, time.November, 9, 10), c)
		if !errors.Is(err, ErrOwnerChangeForbidden) {
			t.Fatalf("got %v, want ErrOwnerChangeForbidden", err)
		}
	})

	t.Run("an unknown owner type falls back to company", func(t *testing.T) {
		got, err := ResolveOwnerOnCreate(sales, "", nil, bkk(2026, time.November, 9, 10), c)
		if err != nil {
			t.Fatal(err)
		}
		if got.OwnerType != "company" {
			t.Fatalf("got %+v", got)
		}
	})
}

func TestResolveOwnerOnCreateForAdmin(t *testing.T) {
	c := cutoff(t, "2026-12-31")
	admin := Actor{ID: 1, Role: "admin"}
	now := bkk(2027, time.March, 1, 10) // after the cut-off on purpose

	t.Run("a lead the company registers is a company lead", func(t *testing.T) {
		got, err := ResolveOwnerOnCreate(admin, "company", nil, now, c)
		if err != nil {
			t.Fatal(err)
		}
		if got.OwnerType != "company" || got.OwnerUserID != nil {
			t.Fatalf("got %+v — an admin lead starts unassigned", got)
		}
	})

	t.Run("admin may assign the company lead straight away", func(t *testing.T) {
		got, err := ResolveOwnerOnCreate(admin, "company", uptr(7), now, c)
		if err != nil {
			t.Fatal(err)
		}
		if *got.OwnerUserID != 7 {
			t.Fatalf("got %+v", got)
		}
	})

	t.Run("admin may still record an existing customer after the cut-off", func(t *testing.T) {
		got, err := ResolveOwnerOnCreate(admin, "sales_existing", uptr(7), now, c)
		if err != nil {
			t.Fatal(err)
		}
		if got.OwnerType != "sales_existing" || *got.OwnerUserID != 7 {
			t.Fatalf("got %+v", got)
		}
	})

	t.Run("an existing customer must name its sales owner", func(t *testing.T) {
		if _, err := ResolveOwnerOnCreate(admin, "sales_existing", nil, now, c); err == nil {
			t.Fatal("expected an error when no sales owner is named")
		}
	})
}

func TestOnlyAdminCanChangeOwner(t *testing.T) {
	if CanChangeOwner(Actor{ID: 7, Role: "sales"}) {
		t.Error("a sales account must not be able to change ownership")
	}
	if !CanChangeOwner(Actor{ID: 1, Role: "admin"}) {
		t.Error("an admin must be able to change ownership")
	}
}

func TestCanEditLead(t *testing.T) {
	owner := Actor{ID: 7, Role: "sales"}
	other := Actor{ID: 8, Role: "sales"}
	admin := Actor{ID: 1, Role: "admin"}

	if !CanEditLead(owner, uptr(7)) {
		t.Error("the owner must be able to edit their own lead")
	}
	if CanEditLead(other, uptr(7)) {
		t.Error("a sales account must not edit someone else's lead")
	}
	if CanEditLead(other, nil) {
		t.Error("a sales account must not edit an unassigned company lead")
	}
	if !CanEditLead(admin, uptr(7)) || !CanEditLead(admin, nil) {
		t.Error("an admin must be able to edit any lead")
	}
}

func TestValidateStageChangeBlocksDoNotPitch(t *testing.T) {
	t.Run("a do_not_pitch lead cannot be moved to proposal", func(t *testing.T) {
		if err := ValidateStageChange(true, "proposal"); !errors.Is(err, ErrDoNotPitch) {
			t.Fatalf("got %v, want ErrDoNotPitch", err)
		}
	})
	t.Run("nor to won", func(t *testing.T) {
		if err := ValidateStageChange(true, "won"); !errors.Is(err, ErrDoNotPitch) {
			t.Fatalf("got %v, want ErrDoNotPitch", err)
		}
	})
	t.Run("but may still be tracked", func(t *testing.T) {
		for _, stage := range []string{"new", "contacted", "meeting", "nurture", "lost"} {
			if err := ValidateStageChange(true, stage); err != nil {
				t.Errorf("stage %q: %v", stage, err)
			}
		}
	})
	t.Run("an ordinary lead can go anywhere valid", func(t *testing.T) {
		for _, stage := range []string{"new", "contacted", "meeting", "proposal", "won", "lost", "nurture"} {
			if err := ValidateStageChange(false, stage); err != nil {
				t.Errorf("stage %q: %v", stage, err)
			}
		}
	})
	t.Run("an unknown stage is rejected", func(t *testing.T) {
		if err := ValidateStageChange(false, "closed"); !errors.Is(err, ErrInvalidStage) {
			t.Fatalf("got %v, want ErrInvalidStage", err)
		}
	})
}

func TestQuarterOf(t *testing.T) {
	cases := map[int]int{1: 1, 2: 1, 3: 1, 4: 2, 6: 2, 7: 3, 9: 3, 10: 4, 12: 4, 0: 0, 13: 0}
	for month, want := range cases {
		if got := QuarterOf(month); got != want {
			t.Errorf("QuarterOf(%d) = %d, want %d", month, got, want)
		}
	}
}
