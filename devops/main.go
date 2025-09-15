package main

import (
	"context"
	"log"
	"time"

	"transc-exporter/config"
	"transc-exporter/metrics"
	"transc-exporter/probe"
	"transc-exporter/server"
)

func main() {
	cfg := config.Load()

	reg := metrics.NewRegistryAndRegisterAll()
	server.ServerMetrics(reg, ":9101")

	ticker := time.NewTicker(cfg.ScrapeInterval())
	defer ticker.Stop()

	for {
		start := time.Now()

		if err := scrapeOnce(context.Background(), cfg); err != nil {
			log.Printf("Scrape error: %v", err)
			metrics.ScrapeErrors.Inc()
		}
		metrics.ScrapeDuration.Observe(time.Since(start).Seconds())
		<-ticker.C
	}
}

func scrapeOnce(ctx context.Context, cfg *config.Config) error {
	if ok, lat, err := probe.CheckHealth(ctx, cfg); err != nil {
		return err
	} else {
		if ok {
			metrics.BackendHealthUp.Set(1)
		} else {
			metrics.BackendHealthUp.Set(0)
		}
		metrics.BackendHealthLatency.Observe(lat.Seconds())
	}

	online, ingame, err := probe.CollectUsers(ctx, cfg)
  if err != nil {
		return err
	} else {
		metrics.UsersOnline.Set(float64(online))
		metrics.UsersInGame.Set(float64(ingame))
	}

	if rtt, err := probe.CheckWebSocket(ctx, cfg); err != nil {
		metrics.WSUp.Set(0)
	} else {
		metrics.WSUp.Set(1)
		metrics.WSPingRTT.Observe(rtt.Seconds())
	}

	return nil
}
