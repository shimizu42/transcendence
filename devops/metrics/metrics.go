package metrics

import "github.com/prometheus/client_golang/prometheus"

var (
	ScrapeDuration = prometheus.NewHistogram(prometheus.HistogramOpts{
		Name: "transc_scrape_duration_seconds", Help: "Scrape time in seconds",
		Buckets: []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
	})

	ScrapeErrors = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "transc_scrape_errors_total", Help: "Total number of scrape errors",
	})

	BackendHealthUp = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "backend_health_up", Help: "Backend health status (1 = up, 0 = down)",
	})

	BackendHealthLatency = prometheus.NewHistogram(prometheus.HistogramOpts{
		Name: "backend_health_latency_seconds", Help: "Backend health check latency in seconds",
		Buckets: []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
	})

	UsersOnline = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "users_online", Help: "Number of users currently online",
	})

	UsersInGame = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "users_in_game", Help: "Number of users currently in-game",
	})

	WSUp = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "websocket_up", Help: "WebSocket connection status (1 = up, 0 = down)",
	})

	WSPingRTT = prometheus.NewHistogram(prometheus.HistogramOpts{
		Name: "websocket_ping_rtt_seconds", Help: "WebSocket ping round-trip time in seconds",
		Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1},
	})
)

func NewRegistryAndRegisterAll() *prometheus.Registry {
	reg := prometheus.NewRegistry()
	reg.MustRegister(
		ScrapeDuration, ScrapeErrors,
		BackendHealthUp, BackendHealthLatency,
		UsersOnline, UsersInGame,
		WSUp, WSPingRTT,
		prometheus.NewGoCollector(),
		prometheus.NewProcessCollector(prometheus.ProcessCollectorOpts{}),
	)
	return reg
}
