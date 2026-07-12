// Package strava is a minimal client for the Strava v3 API (personal use).
package strava

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	authBase  = "https://www.strava.com/oauth/authorize"
	tokenURL  = "https://www.strava.com/oauth/token"
	apiBase   = "https://www.strava.com/api/v3"
	scopeRead = "read,activity:read_all"
)

// Client holds the app credentials issued in your Strava API settings.
type Client struct {
	ClientID     string
	ClientSecret string
	http         *http.Client
}

func New(id, secret string) *Client {
	return &Client{ClientID: id, ClientSecret: secret, http: &http.Client{Timeout: 30 * time.Second}}
}

func (c *Client) Configured() bool { return c.ClientID != "" && c.ClientSecret != "" }

// AuthURL builds the consent URL the user visits to authorize the app.
func (c *Client) AuthURL(redirectURI, state string) string {
	q := url.Values{}
	q.Set("client_id", c.ClientID)
	q.Set("redirect_uri", redirectURI)
	q.Set("response_type", "code")
	q.Set("scope", scopeRead)
	q.Set("approval_prompt", "auto")
	if state != "" {
		q.Set("state", state)
	}
	return authBase + "?" + q.Encode()
}

// Token is the OAuth token set returned/refreshed by Strava.
type Token struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresAt    int64  `json:"expires_at"`
	Athlete      struct {
		ID        int64  `json:"id"`
		Firstname string `json:"firstname"`
		Lastname  string `json:"lastname"`
	} `json:"athlete"`
}

func (t *Token) Expired() bool { return time.Now().Unix() >= t.ExpiresAt-60 }

// Exchange trades an authorization code for a token set.
func (c *Client) Exchange(ctx context.Context, code, redirectURI string) (*Token, error) {
	return c.tokenReq(ctx, url.Values{
		"client_id":     {c.ClientID},
		"client_secret": {c.ClientSecret},
		"code":          {code},
		"grant_type":    {"authorization_code"},
		"redirect_uri":  {redirectURI},
	})
}

// Refresh renews an expired access token using the refresh token.
func (c *Client) Refresh(ctx context.Context, refreshToken string) (*Token, error) {
	return c.tokenReq(ctx, url.Values{
		"client_id":     {c.ClientID},
		"client_secret": {c.ClientSecret},
		"grant_type":    {"refresh_token"},
		"refresh_token": {refreshToken},
	})
}

func (c *Client) tokenReq(ctx context.Context, form url.Values) (*Token, error) {
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("strava token error (%d): %s", resp.StatusCode, string(raw))
	}
	var t Token
	if err := json.Unmarshal(raw, &t); err != nil {
		return nil, err
	}
	if t.AccessToken == "" {
		return nil, errors.New("strava: empty access token")
	}
	return &t, nil
}

// Activity is the subset of a Strava activity we care about.
type Activity struct {
	ID                 int64   `json:"id"`
	Name               string  `json:"name"`
	Type               string  `json:"type"`
	SportType          string  `json:"sport_type"`
	WorkoutType        *int    `json:"workout_type"`
	Distance           float64 `json:"distance"`        // meters
	MovingTime         float64 `json:"moving_time"`     // seconds
	ElapsedTime        float64 `json:"elapsed_time"`    // seconds
	TotalElevationGain float64 `json:"total_elevation_gain"`
	StartDateLocal     string  `json:"start_date_local"`
	AverageSpeed       float64 `json:"average_speed"` // m/s
	MaxSpeed           float64 `json:"max_speed"`
	AverageHeartrate   float64 `json:"average_heartrate"`
	MaxHeartrate       float64 `json:"max_heartrate"`
	AverageCadence     float64 `json:"average_cadence"`
	AverageWatts       float64 `json:"average_watts"`
	Kilojoules         float64 `json:"kilojoules"`
	Calories           float64 `json:"calories"`
	StartLatlng        []float64 `json:"start_latlng"`
	Map                struct {
		SummaryPolyline string `json:"summary_polyline"`
		Polyline        string `json:"polyline"`
	} `json:"map"`
}

// Activities fetches up to `max` recent activities (paginated, 100 per page).
func (c *Client) Activities(ctx context.Context, accessToken string, max int) ([]Activity, error) {
	var out []Activity
	perPage := 100
	for page := 1; len(out) < max; page++ {
		u := fmt.Sprintf("%s/athlete/activities?per_page=%d&page=%d", apiBase, perPage, page)
		req, _ := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)
		resp, err := c.http.Do(req)
		if err != nil {
			return out, err
		}
		raw, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			return out, fmt.Errorf("strava activities error (%d): %s", resp.StatusCode, string(raw))
		}
		var batch []Activity
		if err := json.Unmarshal(raw, &batch); err != nil {
			return out, err
		}
		if len(batch) == 0 {
			break
		}
		out = append(out, batch...)
		if len(batch) < perPage {
			break
		}
	}
	if len(out) > max {
		out = out[:max]
	}
	return out, nil
}
