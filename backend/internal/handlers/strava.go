package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"garmin-analyzer/internal/auth"
	"garmin-analyzer/internal/strava"
	"garmin-analyzer/internal/users"

	"github.com/gin-gonic/gin"
)

// Injected from main.
var (
	StravaRedirect string // e.g. http://localhost:8080/api/strava/callback
	FrontendURL    string
)

// stravaClientFor builds a Strava client from the user's stored credentials.
func (h *Handler) stravaClientFor(sub string) (*strava.Client, error) {
	creds, err := Users.LoadStravaCreds(sub)
	if err != nil || creds.ClientID == "" || creds.ClientSecret == "" {
		return nil, errors.New("strava credentials not set")
	}
	return strava.New(creds.ClientID, creds.ClientSecret), nil
}

func saveUserToken(sub string, t *strava.Token) error {
	b, _ := json.MarshalIndent(t, "", "  ")
	return os.WriteFile(Users.StravaTokenPath(sub), b, 0o600)
}

func loadUserToken(sub string) (*strava.Token, error) {
	b, err := os.ReadFile(Users.StravaTokenPath(sub))
	if err != nil {
		return nil, err
	}
	var t strava.Token
	if err := json.Unmarshal(b, &t); err != nil {
		return nil, err
	}
	return &t, nil
}

// GetStravaCredentials returns the saved client ID (never the secret).
func (h *Handler) GetStravaCredentials(c *gin.Context) {
	creds, err := Users.LoadStravaCreds(c.GetString("uid"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"clientId": "", "hasSecret": false})
		return
	}
	c.JSON(http.StatusOK, gin.H{"clientId": creds.ClientID, "hasSecret": creds.ClientSecret != ""})
}

// SaveStravaCredentials persists the user's Strava app keys forever.
func (h *Handler) SaveStravaCredentials(c *gin.Context) {
	var body users.StravaCreds
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}
	if strings.TrimSpace(body.ClientID) == "" || strings.TrimSpace(body.ClientSecret) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "client ID and secret are required"})
		return
	}
	if err := Users.SaveStravaCreds(c.GetString("uid"), &body); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "saved"})
}

// StravaStatus reports configured (keys saved) and connected (token present).
func (h *Handler) StravaStatus(c *gin.Context) {
	sub := c.GetString("uid")
	creds, _ := Users.LoadStravaCreds(sub)
	_, tokErr := os.Stat(Users.StravaTokenPath(sub))
	resp := gin.H{"configured": creds != nil && creds.ClientID != "", "connected": tokErr == nil}
	if t, err := loadUserToken(sub); err == nil {
		resp["athlete"] = strings.TrimSpace(t.Athlete.Firstname + " " + t.Athlete.Lastname)
	}
	c.JSON(http.StatusOK, resp)
}

// StravaAuthURL builds the consent URL, carrying the user id in signed state.
func (h *Handler) StravaAuthURL(c *gin.Context) {
	sub := c.GetString("uid")
	client, err := h.stravaClientFor(sub)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Save your Strava Client ID and Secret first."})
		return
	}
	state, _ := auth.Sign(SessionSecret, auth.Session{Sub: sub, Exp: time.Now().Add(15 * time.Minute).Unix()})
	c.JSON(http.StatusOK, gin.H{"url": client.AuthURL(StravaRedirect, state)})
}

// StravaCallback handles the OAuth redirect (no cookie — identity comes from signed state).
func (h *Handler) StravaCallback(c *gin.Context) {
	code, state := c.Query("code"), c.Query("state")
	var s auth.Session
	if err := auth.Verify(SessionSecret, state, &s); err != nil || !s.Valid() {
		c.String(http.StatusBadRequest, "invalid or expired state")
		return
	}
	client, err := h.stravaClientFor(s.Sub)
	if err != nil {
		c.String(http.StatusBadRequest, err.Error())
		return
	}
	tok, err := client.Exchange(c.Request.Context(), code, StravaRedirect)
	if err != nil {
		c.String(http.StatusBadGateway, "strava exchange failed: "+err.Error())
		return
	}
	_ = saveUserToken(s.Sub, tok)
	c.Redirect(http.StatusFound, FrontendURL+"/onboarding?strava=connected")
}

// StravaSync pulls the user's activities and stores them as their races.
func (h *Handler) StravaSync(c *gin.Context) {
	sub := c.GetString("uid")
	client, err := h.stravaClientFor(sub)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Strava not configured."})
		return
	}
	tok, err := loadUserToken(sub)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Connect Strava first."})
		return
	}
	if tok.Expired() {
		refreshed, err := client.Refresh(context.Background(), tok.RefreshToken)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}
		refreshed.Athlete = tok.Athlete
		_ = saveUserToken(sub, refreshed)
		tok = refreshed
	}
	acts, err := client.Activities(c.Request.Context(), tok.AccessToken, 200)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	dir := Users.RacesDir(sub)
	imported, skipped := 0, 0
	for _, a := range acts {
		race, ok := activityToRace(a)
		if !ok {
			skipped++
			continue
		}
		out, _ := json.MarshalIndent(race, "", "  ")
		if os.WriteFile(filepath.Join(dir, "race_"+race.ID+".json"), out, 0o644) == nil {
			imported++
		}
	}
	c.JSON(http.StatusOK, gin.H{"imported": imported, "skipped": skipped, "total": len(acts)})
}

// StravaDisconnect removes the user's stored token.
func (h *Handler) StravaDisconnect(c *gin.Context) {
	_ = os.Remove(Users.StravaTokenPath(c.GetString("uid")))
	c.JSON(http.StatusOK, gin.H{"status": "disconnected"})
}

func mapStravaSport(t string) string {
	switch {
	case strings.EqualFold(t, "Run"), strings.EqualFold(t, "TrailRun"), strings.EqualFold(t, "VirtualRun"):
		return "running"
	case strings.Contains(strings.ToLower(t), "ride"):
		return "cycling"
	case strings.EqualFold(t, "Swim"):
		return "swimming"
	default:
		return ""
	}
}

func activityToRace(a strava.Activity) (Race, bool) {
	sport := mapStravaSport(a.Type)
	if sport == "" {
		return Race{}, false
	}
	distKm := a.Distance / 1000.0
	dur := a.MovingTime
	if dur == 0 {
		dur = a.ElapsedTime
	}
	pace := 0.0
	if distKm > 0 && dur > 0 {
		pace = dur / distKm
	}
	cadence := a.AverageCadence
	if sport == "running" && cadence > 0 {
		cadence *= 2
	}
	cal := a.Calories
	if cal == 0 && a.Kilojoules > 0 {
		cal = a.Kilojoules
	}
	date := a.StartDateLocal
	if len(date) >= 10 {
		date = date[:10]
	}
	return Race{
		ID:           "strava-" + strconv.FormatInt(a.ID, 10),
		Name:         a.Name,
		Sport:        sport,
		Date:         date,
		DistanceKm:   round2(distKm),
		DurationSec:  dur,
		AvgPaceSecKm: round2(pace),
		AvgHR:        a.AverageHeartrate,
		MaxHR:        a.MaxHeartrate,
		AvgCadence:   round2(cadence),
		AvgPowerW:    a.AverageWatts,
		Calories:     cal,
		Elevation:    a.TotalElevationGain,
		Polyline:     a.Map.SummaryPolyline,
		StartLatLng:  a.StartLatlng,
	}, true
}
