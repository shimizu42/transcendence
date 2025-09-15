package probe

import (
	"context"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"transc-exporter/config"
)

func CheckWebSocket(ctx context.Context, cfg *config.Config) (time.Duration, error) {
	d := websocket.Dialer{
		HandshakeTimeout: cfg.WSTimeout(),
	}

	var hdr http.Header
	if tok := cfg.APIToken(); tok != "" {
		hdr = http.Header{}
		hdr.Set("Authorization", "Bearer "+tok)
	}

	conn, _, err := d.DialContext(
		ctx,
		cfg.WSURL(),
		hdr,
	)
  if err != nil {
    return 0, err
  }
  defer conn.Close()

	deadline := time.Now().Add(2 * time.Second)
	if dl, ok := ctx.Deadline(); ok && dl.Before(deadline) {
		deadline = dl
	}

	t0 := time.Now()
	done := make(chan time.Duration, 1)
	conn.SetPongHandler(func(appData string) error {
		done <- time.Since(t0)
		return nil
	})

	_ = conn.SetReadDeadline(deadline)

	if err := conn.WriteControl(
		websocket.PingMessage,
		[]byte("ping"),
		deadline,
	); err != nil {
		return 0, err
	}

	for {
		select {
		case rtt := <-done:
			return rtt, nil
		default:
			if _, _, er := conn.ReadMessage(); er != nil {
				return 0, er
			}
		}
	}
}
