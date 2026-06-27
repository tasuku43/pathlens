//go:build !otel

package telemetry_test

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/tasuku43/vivi/internal/telemetry"
)

func TestDefaultTelemetryIsDisabled(t *testing.T) {
	if telemetry.Enabled() {
		t.Fatal("default build must not enable telemetry")
	}
}

func TestDefaultOperationSampleIsNoop(t *testing.T) {
	sample := telemetry.StartOperation()
	stats := sample.Finish(telemetry.OperationStats{ScannedFiles: 3})

	if stats.ScannedFiles != 3 {
		t.Fatalf("ScannedFiles = %d, want caller-provided stats preserved", stats.ScannedFiles)
	}
	if stats.DurationMs != 0 || stats.MemoryHeapAllocBytes != 0 || stats.CPUTotalMs != 0 || stats.Goroutines != 0 {
		t.Fatalf("default operation sample should not measure resources: %#v", stats)
	}
}

func TestDefaultCliImportGraphExcludesOpenTelemetrySDK(t *testing.T) {
	cwd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	root := filepath.Clean(filepath.Join(cwd, "..", ".."))
	cmd := exec.Command("go", "list", "-deps", "./cli")
	cmd.Dir = root
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("go list failed: %v\n%s", err, string(output))
	}
	deps := string(output)
	for _, forbidden := range []string{
		"go.opentelemetry.io/otel",
		"go.opentelemetry.io/otel/sdk",
		"go.opentelemetry.io/otel/exporters/otlp",
	} {
		if strings.Contains(deps, forbidden) {
			t.Fatalf("default CLI import graph includes %s", forbidden)
		}
	}
}
