package api

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
	"github.com/owldayhouse/odh-internal-api/pkg/services/storage"
)

// GetMeta hands the UI every enum, the sales roster and the current cut-off, so
// the front end never hardcodes a list that lives in the API.
func (s *Server) GetMeta(c echo.Context) error {
	users, err := s.UserStore.ListAll()
	if err != nil {
		return s.serverError(c, err)
	}

	// Only active accounts can be lead owners.
	owners := make([]*models.User, 0, len(users))
	for _, u := range users {
		if u.Status == models.StatusActive {
			owners = append(owners, u)
		}
	}

	cutoff := ""
	if row, err := s.SettingStore.Get(models.SettingSalesExistingCutoff); err == nil {
		cutoff = row.Value
	} else if !isNotFound(err) {
		return s.serverError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"industries":            models.Industries(),
		"sources":               models.Sources(),
		"stages":                models.Stages(),
		"interests":             models.Interests(),
		"owner_types":           models.OwnerTypes(),
		"activity_types":        models.ActivityTypes(),
		"users":                 owners,
		"sales_existing_cutoff": cutoff,
		"similarity_threshold":  s.Config.Leads.SimilarityThreshold,
		"upload": map[string]interface{}{
			"max_bytes":  s.Storage.MaxUploadBytes(),
			"extensions": storage.AllowedExtensions(),
		},
		"default_targets": map[string]interface{}{
			"revenue_target":   models.DefaultRevenueTarget,
			"proposals_target": models.DefaultProposalsTarget,
			"meetings_target":  models.DefaultMeetingsTarget,
		},
	})
}
