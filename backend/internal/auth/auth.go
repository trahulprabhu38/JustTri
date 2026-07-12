// Package auth handles Google SSO verification and HMAC-signed session tokens.
package auth

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Sign creates an HMAC-signed base64url token carrying the JSON payload.
func Sign(secret string, payload any) (string, error) {
	b, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	p := base64.RawURLEncoding.EncodeToString(b)
	return p + "." + mac(secret, p), nil
}

// Verify checks the signature and unmarshals the payload into out.
func Verify(secret, token string, out any) error {
	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 {
		return errors.New("malformed token")
	}
	if !hmac.Equal([]byte(mac(secret, parts[0])), []byte(parts[1])) {
		return errors.New("bad signature")
	}
	b, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return err
	}
	return json.Unmarshal(b, out)
}

func mac(secret, msg string) string {
	m := hmac.New(sha256.New, []byte(secret))
	m.Write([]byte(msg))
	return base64.RawURLEncoding.EncodeToString(m.Sum(nil))
}

// Session is the payload stored in the auth cookie (and in Strava OAuth state).
type Session struct {
	Sub     string `json:"sub"`
	Email   string `json:"email,omitempty"`
	Name    string `json:"name,omitempty"`
	Picture string `json:"picture,omitempty"`
	Exp     int64  `json:"exp"`
}

func (s Session) Valid() bool { return time.Now().Unix() < s.Exp }

// GoogleClaims is the subset of Google's tokeninfo response we use.
type GoogleClaims struct {
	Sub     string `json:"sub"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
	Aud     string `json:"aud"`
}

// VerifyGoogleIDToken validates a Google ID token via the tokeninfo endpoint.
func VerifyGoogleIDToken(ctx context.Context, idToken, clientID string) (*GoogleClaims, error) {
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet,
		"https://oauth2.googleapis.com/tokeninfo?id_token="+idToken, nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("google verification failed (%d)", resp.StatusCode)
	}
	var c GoogleClaims
	if err := json.Unmarshal(raw, &c); err != nil {
		return nil, err
	}
	if clientID != "" && c.Aud != clientID {
		return nil, errors.New("token audience mismatch")
	}
	if c.Sub == "" {
		return nil, errors.New("no subject in token")
	}
	return &c, nil
}
