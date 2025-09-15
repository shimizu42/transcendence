package config

import (
	"os"
	"time"
)

type Config struct {
	backendBase    string
	wsURL          string
	apiToken       string
	scrapeInterval time.Duration
	httpTimeout    time.Duration
	wsTimeout      time.Duration
}

func Load() *Config {
	return &Config{
		backendBase:    getEnv("BACKEND_BASE", "http://backend:3001"),
		wsURL:          getEnv("WS_URL", "ws://backend:3001/ws"),
		apiToken:       os.Getenv("API_TOKEN"),
		scrapeInterval: getEnvDuration("SCRAPE_INTERVAL", 5*time.Second),
		httpTimeout:    getEnvDuration("HTTP_TIMEOUT", 2*time.Second),
		wsTimeout:      getEnvDuration("WS_TIMEOUT", 3*time.Second),
	}
}

func (c Config) BackendBase() string           { return c.backendBase }
func (c Config) WSURL() string                 { return c.wsURL }
func (c Config) APIToken() string              { return c.apiToken }
func (c Config) ScrapeInterval() time.Duration { return c.scrapeInterval }
func (c Config) HTTPTimeout() time.Duration    { return c.httpTimeout }
func (c Config) WSTimeout() time.Duration      { return c.wsTimeout }

func getEnv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func getEnvDuration(k string, def time.Duration) time.Duration {
	if v := os.Getenv(k); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return def
}
