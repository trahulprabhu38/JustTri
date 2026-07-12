package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

const defaultModel = "gpt-4o-mini"

// Client talks to the OpenAI Chat Completions API.
type Client struct {
	APIKey string
	Model  string
	http   *http.Client
}

// NewClient builds a client; model falls back to a sensible default.
func NewClient(apiKey, model string) *Client {
	if model == "" {
		model = defaultModel
	}
	return &Client{
		APIKey: apiKey,
		Model:  model,
		http:   &http.Client{Timeout: 60 * time.Second},
	}
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model       string        `json:"model"`
	Messages    []chatMessage `json:"messages"`
	Temperature float64       `json:"temperature"`
}

type chatResponse struct {
	Choices []struct {
		Message chatMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

// Complete sends a system+user prompt and returns the assistant's reply.
func (c *Client) Complete(ctx context.Context, system, user string) (string, error) {
	if c.APIKey == "" {
		return "", errors.New("no OpenAI API key configured")
	}
	body, _ := json.Marshal(chatRequest{
		Model:       c.Model,
		Temperature: 0.4,
		Messages: []chatMessage{
			{Role: "system", Content: system},
			{Role: "user", Content: user},
		},
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.APIKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)

	var parsed chatResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", fmt.Errorf("openai: bad response (%d): %s", resp.StatusCode, string(raw))
	}
	if parsed.Error != nil {
		return "", fmt.Errorf("openai: %s", parsed.Error.Message)
	}
	if len(parsed.Choices) == 0 {
		return "", errors.New("openai: empty response")
	}
	return parsed.Choices[0].Message.Content, nil
}
