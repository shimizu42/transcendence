// probe/health.go

package probe

import (
	"context"
	"net/http"
	"time"

	"transc-exporter/config"
)

func CheckHealth(ctx context.Context, cfg *config.Config) (ok bool, lat time.Duration, err error) {
	client := &http.Client{
		Timeout: cfg.HTTPTimeout(),
	}
	req, _ := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		cfg.BackendBase()+"/health",
		nil,
	)
	if cfg.APIToken() != "" {
		req.Header.Set("Authorization", "Bearer "+cfg.APIToken())
	}
	t0 := time.Now()
	resq, err := client.Do(req)
	lat = time.Since(t0)
	if err != nil {
		return false, lat, err
	}
	defer resq.Body.Close()
	return resq.StatusCode/100 == 2, lat, nil
}
