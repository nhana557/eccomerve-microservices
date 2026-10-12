package logger

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"sync"
	"time"

	"go.opentelemetry.io/otel/trace"
)

type lokiLogEntry struct {
	timestampNano string
	serviceName   string
	level         string
	line          string
}

type lokiPusher struct {
	url     string
	logChan chan lokiLogEntry
	client  *http.Client
}

var (
	pusherMu       sync.RWMutex
	currentPusher  *lokiPusher
	currentPusherURL string
)

func getLokiPusher() *lokiPusher {
	rawURL := os.Getenv("LOKI_URL")
	if rawURL == "" {
		rawURL = "http://localhost:3100"
	}
	if rawURL == "none" || rawURL == "disabled" {
		return nil
	}

	pusherMu.RLock()
	if currentPusher != nil && currentPusherURL == rawURL {
		p := currentPusher
		pusherMu.RUnlock()
		return p
	}
	pusherMu.RUnlock()

	pusherMu.Lock()
	defer pusherMu.Unlock()
	if currentPusher != nil && currentPusherURL == rawURL {
		return currentPusher
	}

	p := &lokiPusher{
		url:     rawURL,
		logChan: make(chan lokiLogEntry, 2048),
		client: &http.Client{
			Timeout: 2 * time.Second,
		},
	}
	go p.worker()
	currentPusher = p
	currentPusherURL = rawURL
	return p
}

func (p *lokiPusher) worker() {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	var batch []lokiLogEntry
	flush := func() {
		if len(batch) == 0 {
			return
		}
		toSend := batch
		batch = nil

		type streamKey struct {
			service string
			level   string
		}
		grouped := make(map[streamKey][][2]string)
		for _, entry := range toSend {
			k := streamKey{service: entry.serviceName, level: entry.level}
			grouped[k] = append(grouped[k], [2]string{entry.timestampNano, entry.line})
		}

		type streamObj struct {
			Stream map[string]string `json:"stream"`
			Values [][2]string       `json:"values"`
		}
		type pushPayload struct {
			Streams []streamObj `json:"streams"`
		}

		payload := pushPayload{}
		for k, vals := range grouped {
			payload.Streams = append(payload.Streams, streamObj{
				Stream: map[string]string{
					"service_name": k.service,
					"level":        k.level,
				},
				Values: vals,
			})
		}

		data, err := json.Marshal(payload)
		if err != nil {
			return
		}

		req, err := http.NewRequest(http.MethodPost, p.url+"/loki/api/v1/push", bytes.NewReader(data))
		if err != nil {
			return
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := p.client.Do(req)
		if err == nil {
			_ = resp.Body.Close()
		}
	}

	for {
		select {
		case entry, ok := <-p.logChan:
			if !ok {
				flush()
				return
			}
			batch = append(batch, entry)
			if len(batch) >= 50 {
				flush()
			}
		case <-ticker.C:
			flush()
		}
	}
}

type otelHandler struct {
	slog.Handler
	serviceName string
}

func (h *otelHandler) Handle(ctx context.Context, r slog.Record) error {
	span := trace.SpanFromContext(ctx)
	if span.SpanContext().IsValid() {
		r.AddAttrs(
			slog.String("trace_id", span.SpanContext().TraceID().String()),
			slog.String("span_id", span.SpanContext().SpanID().String()),
		)
	}

	if pusher := getLokiPusher(); pusher != nil {
		var buf bytes.Buffer
		tempH := slog.NewJSONHandler(&buf, &slog.HandlerOptions{Level: r.Level})
		_ = tempH.Handle(ctx, r)
		line := buf.String()
		if len(line) > 0 {
			ts := fmt.Sprintf("%d", r.Time.UnixNano())
			if r.Time.IsZero() {
				ts = fmt.Sprintf("%d", time.Now().UnixNano())
			}
			select {
			case pusher.logChan <- lokiLogEntry{
				timestampNano: ts,
				serviceName:   h.serviceName,
				level:         r.Level.String(),
				line:          line,
			}:
			default:
			}
		}
	}

	return h.Handler.Handle(ctx, r)
}

func (h *otelHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &otelHandler{
		Handler:     h.Handler.WithAttrs(attrs),
		serviceName: h.serviceName,
	}
}

func (h *otelHandler) WithGroup(name string) slog.Handler {
	return &otelHandler{
		Handler:     h.Handler.WithGroup(name),
		serviceName: h.serviceName,
	}
}

func NewWithWriter(serviceName string, w io.Writer) *slog.Logger {
	baseHandler := slog.NewJSONHandler(w, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	handler := &otelHandler{
		Handler:     baseHandler,
		serviceName: serviceName,
	}
	return slog.New(handler).With("service_name", serviceName)
}

func New(serviceName string) *slog.Logger {
	return NewWithWriter(serviceName, os.Stdout)
}
