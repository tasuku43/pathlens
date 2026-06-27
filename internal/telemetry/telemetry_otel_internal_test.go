//go:build otel

package telemetry

import (
	"runtime"
	"testing"
	"time"
)

func TestOtelOperationSampleAddsResourceStatsWhenEnabled(t *testing.T) {
	otelEnabled.Store(true)
	defer otelEnabled.Store(false)

	sample := StartOperation()
	allocated := make([]byte, 64*1024)
	for index := range allocated {
		allocated[index] = byte(index)
	}
	time.Sleep(time.Millisecond)

	stats := sample.Finish(OperationStats{ScannedFiles: 3})
	runtime.KeepAlive(allocated)

	if stats.DurationMs <= 0 {
		t.Fatalf("DurationMs = %d, want positive duration", stats.DurationMs)
	}
	if stats.ScannedFiles != 3 {
		t.Fatalf("ScannedFiles = %d, want caller-provided stats preserved", stats.ScannedFiles)
	}
	if stats.MemoryHeapAllocBytes <= 0 {
		t.Fatalf("MemoryHeapAllocBytes = %d, want current heap allocation", stats.MemoryHeapAllocBytes)
	}
	if stats.MemoryTotalAllocDeltaBytes <= 0 {
		t.Fatalf("MemoryTotalAllocDeltaBytes = %d, want allocation delta", stats.MemoryTotalAllocDeltaBytes)
	}
	if stats.CPUTotalMs < 0 || stats.CPUPercent < 0 {
		t.Fatalf("CPU stats must be non-negative: total=%d percent=%f", stats.CPUTotalMs, stats.CPUPercent)
	}
	if stats.Goroutines <= 0 {
		t.Fatalf("Goroutines = %d, want current goroutine count", stats.Goroutines)
	}
}
