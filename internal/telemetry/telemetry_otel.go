//go:build otel

package telemetry

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/url"
	"os"
	"strings"
	"sync/atomic"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/trace"
)

var (
	tracer      trace.Tracer = trace.NewNoopTracerProvider().Tracer("github.com/tasuku43/vivi")
	otelEnabled atomic.Bool
)

func Init(ctx context.Context, stderr io.Writer) (ShutdownFunc, error) {
	endpoint := configuredEndpoint()
	if !collectorReachable(endpoint) {
		fmt.Fprintf(stderr, "[vivi] OpenTelemetry enabled, but collector %s is not reachable; continuing without telemetry export.\n", endpoint)
		return func(context.Context) error { return nil }, nil
	}
	exporter, err := otlptracegrpc.New(ctx, otlptracegrpc.WithEndpoint(endpoint), otlptracegrpc.WithInsecure())
	if err != nil {
		fmt.Fprintf(stderr, "[vivi] OpenTelemetry exporter setup failed: %v; continuing without telemetry export.\n", err)
		return func(context.Context) error { return nil }, nil
	}
	provider := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(resource.NewWithAttributes(
			"",
			attribute.String("service.name", "vivi"),
			attribute.String("service.namespace", "local"),
			attribute.String("telemetry.mode", "optional-perf"),
		)),
	)
	otel.SetTracerProvider(provider)
	tracer = provider.Tracer("github.com/tasuku43/vivi")
	otelEnabled.Store(true)
	fmt.Fprintf(stderr, "[vivi] OpenTelemetry export enabled at %s.\n", endpoint)
	return provider.Shutdown, nil
}

func Enabled() bool {
	return otelEnabled.Load()
}

func RecordOperation(ctx context.Context, name string, stats OperationStats) {
	if !otelEnabled.Load() {
		return
	}
	_, span := tracer.Start(ctx, "vivi."+name)
	span.SetAttributes(
		attribute.String("vivi.operation", name),
		attribute.Int64("duration_ms", stats.DurationMs),
		attribute.Int("scanned_directories", stats.ScannedDirectories),
		attribute.Int("scanned_files", stats.ScannedFiles),
		attribute.Int("read_files", stats.ReadFiles),
		attribute.Int("emitted_events", stats.EmittedEvents),
		attribute.Int("result_count", stats.ResultCount),
		attribute.Bool("cached", stats.Cached),
		attribute.Bool("error", stats.Error),
		attribute.Int64("cpu_user_ms", stats.CPUUserMs),
		attribute.Int64("cpu_system_ms", stats.CPUSystemMs),
		attribute.Int64("cpu_total_ms", stats.CPUTotalMs),
		attribute.Float64("cpu_percent", stats.CPUPercent),
		attribute.Int64("memory_heap_alloc_bytes", stats.MemoryHeapAllocBytes),
		attribute.Int64("memory_heap_alloc_delta_bytes", stats.MemoryHeapAllocDeltaBytes),
		attribute.Int64("memory_rss_max_bytes", stats.MemoryRSSMaxBytes),
		attribute.Int64("memory_rss_max_delta_bytes", stats.MemoryRSSMaxDeltaBytes),
		attribute.Int64("memory_total_alloc_delta_bytes", stats.MemoryTotalAllocDeltaBytes),
		attribute.Int64("memory_mallocs_delta", stats.MemoryMallocsDelta),
		attribute.Int64("memory_frees_delta", stats.MemoryFreesDelta),
		attribute.Int("memory_num_gc", stats.MemoryNumGC),
		attribute.Int("goroutines", stats.Goroutines),
	)
	if stats.Error {
		span.SetStatus(codes.Error, "operation failed")
	}
	span.End()
}

func configuredEndpoint() string {
	for _, name := range []string{"VIVI_OTEL_EXPORTER_OTLP_ENDPOINT", "OTEL_EXPORTER_OTLP_ENDPOINT"} {
		value := strings.TrimSpace(os.Getenv(name))
		if value == "" {
			continue
		}
		return normalizeEndpoint(value)
	}
	return "127.0.0.1:24317"
}

func normalizeEndpoint(value string) string {
	if parsed, err := url.Parse(value); err == nil && parsed.Host != "" {
		return parsed.Host
	}
	return strings.TrimPrefix(strings.TrimPrefix(value, "http://"), "https://")
}

func collectorReachable(endpoint string) bool {
	conn, err := net.DialTimeout("tcp", endpoint, 300*time.Millisecond)
	if err != nil {
		return false
	}
	_ = conn.Close()
	return true
}
