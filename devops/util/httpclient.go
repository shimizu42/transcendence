package util

import (
	"net/http"
	"time"
)

func NewHTTPClient(timeoutSeconds int) *http.Client {
	return &http.Client{
		Timeout: time.Duration(timeoutSeconds),
	}
}

func DurationSec(s int) time.Duration {
	return time.Duration(s) * time.Second
}
