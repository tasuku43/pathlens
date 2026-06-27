//go:build !otel

package telemetry

import (
	"context"
	"io"
)

func Init(ctx context.Context, stderr io.Writer) (ShutdownFunc, error) {
	_ = ctx
	_ = stderr
	return func(context.Context) error { return nil }, nil
}

func Enabled() bool {
	return false
}

func RecordOperation(ctx context.Context, name string, stats OperationStats) {
	_ = ctx
	_ = name
	_ = stats
}
