// Package api is the HTTP layer of the Owl Day House internal tools.
//
// Routes are grouped per tool behind a prefix (`/api/leads/...` for the Lead
// Tracker) while auth, accounts and files stay shared, so the next tool is a
// new prefix plus its own handler files — nothing else moves.
package api

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/owldayhouse/odh-internal-api/pkg/core"
	"github.com/owldayhouse/odh-internal-api/pkg/logger"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
	"github.com/owldayhouse/odh-internal-api/pkg/services/storage"
	"github.com/owldayhouse/odh-internal-api/pkg/utils/validator"
	"github.com/sirupsen/logrus"
)

// Server carries the configuration and every dependency the handlers use.
// Handlers depend on the Store interfaces, never on a concrete repository.
type Server struct {
	Config core.Config
	Log    *logrus.Logger

	UserStore         models.UserStore
	SettingStore      models.SettingStore
	FileStore         models.FileStore
	LeadStore         models.LeadStore
	ContactStore      models.ContactStore
	ActivityStore     models.ActivityStore
	DealStore         models.DealStore
	TargetStore       models.TargetStore
	OwnershipLogStore models.OwnershipLogStore
	KPIStore          models.KPIStore
	EgpStore          models.EgpStore

	Storage *storage.Service
}

// NewServer wires the HTTP layer. Uber FX fills every argument.
func NewServer(
	config core.Config,
	log *logrus.Logger,
	userStore models.UserStore,
	settingStore models.SettingStore,
	fileStore models.FileStore,
	leadStore models.LeadStore,
	contactStore models.ContactStore,
	activityStore models.ActivityStore,
	dealStore models.DealStore,
	targetStore models.TargetStore,
	ownershipLogStore models.OwnershipLogStore,
	kpiStore models.KPIStore,
	egpStore models.EgpStore,
	storageService *storage.Service,
) *Server {
	return &Server{
		Config:            config,
		Log:               log,
		UserStore:         userStore,
		SettingStore:      settingStore,
		FileStore:         fileStore,
		LeadStore:         leadStore,
		ContactStore:      contactStore,
		ActivityStore:     activityStore,
		DealStore:         dealStore,
		TargetStore:       targetStore,
		OwnershipLogStore: ownershipLogStore,
		KPIStore:          kpiStore,
		EgpStore:          egpStore,
		Storage:           storageService,
	}
}

// Handler builds the Echo instance with every middleware and route.
func (s *Server) Handler() *echo.Echo {
	e := echo.New()
	e.HideBanner = true
	e.HidePort = true
	e.Validator = validator.New()
	e.HTTPErrorHandler = s.errorHandler

	// Global middleware.
	e.Use(middleware.Recover())
	e.Use(middleware.Secure())
	e.Use(middleware.RequestID())
	e.Use(middleware.BodyLimit("25M"))
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		// Only the internal system's own domain may call this API.
		AllowOrigins:     s.Config.CorsOrigins,
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAuthorization},
		AllowCredentials: false,
		MaxAge:           600,
	}))
	e.Use(middleware.RateLimiter(middleware.NewRateLimiterMemoryStore(60)))
	e.Use(logger.Middleware(s.Log))

	e.GET("/healthz", s.Health)

	// Public: sign-in only. There is no registration and no password-reset
	// request flow, because there is no e-mail in this system.
	auth := e.Group("/auth")
	auth.Use(middleware.RateLimiterWithConfig(middleware.RateLimiterConfig{
		Store: middleware.NewRateLimiterMemoryStoreWithConfig(
			middleware.RateLimiterMemoryStoreConfig{Rate: 0.2, Burst: 8, ExpiresIn: 5 * time.Minute},
		),
		IdentifierExtractor: func(c echo.Context) (string, error) { return c.RealIP(), nil },
		ErrorHandler: func(c echo.Context, _ error) error {
			return c.JSON(http.StatusTooManyRequests, errorBody("ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่"))
		},
		DenyHandler: func(c echo.Context, _ string, _ error) error {
			return c.JSON(http.StatusTooManyRequests, errorBody("ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่"))
		},
	}))
	auth.POST("/login", s.Login)

	// Everything else needs a signed-in, active account.
	api := e.Group("/api", s.JwtMiddleware())
	api.GET("/me", s.GetMe)
	api.PATCH("/me/password", s.ChangeMyPassword)
	api.GET("/meta", s.GetMeta)

	s.registerFileRoutes(api)
	s.registerLeadRoutes(api)
	s.registerEgpRoutes(api)
	s.registerAdminRoutes(api)

	return e
}

// registerFileRoutes wires the shared attachment endpoints. Bytes never touch
// this server: the browser PUTs to R2 and GETs from R2 via presigned URLs.
func (s *Server) registerFileRoutes(api *echo.Group) {
	files := api.Group("/files")
	files.GET("", s.ListFiles)
	files.POST("/upload-url", s.CreateUploadURL)
	files.POST("/:id/confirm", s.ConfirmUpload)
	files.GET("/:id/download-url", s.CreateDownloadURL)
	files.DELETE("/:id", s.DeleteFile)
}

// registerLeadRoutes wires the Lead Tracker. Keeping the whole tool under one
// prefix is what makes the next tool a drop-in.
func (s *Server) registerLeadRoutes(api *echo.Group) {
	leads := api.Group("/leads")

	// Collection-level, static segments first.
	leads.GET("", s.ListLeads)
	leads.POST("", s.CreateLead)
	leads.GET("/check", s.CheckLeadName)
	leads.GET("/today", s.GetToday)
	leads.GET("/kpi", s.GetKPI)
	leads.GET("/stages", s.GetStageCounts)
	leads.GET("/targets", s.ListTargets)
	leads.PUT("/targets", s.UpsertTarget, s.IsAdmin())
	leads.GET("/export", s.ExportLeads, s.IsAdmin())
	leads.POST("/import", s.ImportLeads, s.IsAdmin())
	leads.GET("/ownership-logs", s.ListRecentOwnershipLogs, s.IsAdmin())

	// One lead.
	leads.GET("/:id", s.GetLead)
	leads.PATCH("/:id", s.UpdateLead)
	leads.POST("/:id/stage", s.ChangeLeadStage)
	leads.POST("/:id/assign", s.AssignLead, s.IsAdmin())
	leads.GET("/:id/ownership-logs", s.ListLeadOwnershipLogs)
	leads.GET("/:id/files", s.ListLeadFiles)

	// Contacts, activities and deals hang off the lead.
	leads.GET("/:id/contacts", s.ListContacts)
	leads.POST("/:id/contacts", s.CreateContact)
	leads.PATCH("/:id/contacts/:contact_id", s.UpdateContact)
	leads.DELETE("/:id/contacts/:contact_id", s.DeleteContact)

	leads.GET("/:id/activities", s.ListActivities)
	leads.POST("/:id/activities", s.CreateActivity)
	leads.DELETE("/:id/activities/:activity_id", s.DeleteActivity)

	leads.GET("/:id/deals", s.ListDeals)
	leads.POST("/:id/deals", s.CreateDeal)
	leads.DELETE("/:id/deals/:deal_id", s.DeleteDeal)
}

// registerAdminRoutes wires the company-only endpoints shared by every tool.
func (s *Server) registerAdminRoutes(api *echo.Group) {
	admin := api.Group("/admin", s.IsAdmin())
	admin.GET("/users", s.ListUsers)
	admin.POST("/users", s.CreateUser)
	admin.PATCH("/users/:id", s.UpdateUser)
	admin.POST("/users/:id/password", s.ResetUserPassword)
	admin.GET("/settings", s.ListSettings)
	admin.PUT("/settings/:key", s.UpdateSetting)
}

// Health is the unauthenticated health check Caddy and the deploy script use.
func (s *Server) Health(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"status":      "ok",
		"environment": s.Config.Environment,
		"commit":      s.Config.Commit,
	})
}

// errorHandler keeps every error in the shared {"error": "..."} shape.
func (s *Server) errorHandler(err error, c echo.Context) {
	if c.Response().Committed {
		return
	}

	status := http.StatusInternalServerError
	message := "เกิดข้อผิดพลาดภายในระบบ"

	var httpErr *echo.HTTPError
	if ok := asHTTPError(err, &httpErr); ok {
		status = httpErr.Code
		if text, isString := httpErr.Message.(string); isString {
			message = text
		} else {
			message = http.StatusText(status)
		}
	} else {
		s.Log.WithError(err).Error("unhandled error")
	}

	if jsonErr := c.JSON(status, errorBody(message)); jsonErr != nil {
		s.Log.WithError(jsonErr).Error("failed to write error response")
	}
}
