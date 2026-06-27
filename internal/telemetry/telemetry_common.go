package telemetry

import (
	"context"
	"runtime"
	"syscall"
	"time"
)

type OperationStats struct {
	DurationMs                 int64
	ScannedDirectories         int
	ScannedFiles               int
	ReadFiles                  int
	EmittedEvents              int
	ResultCount                int
	Cached                     bool
	Error                      bool
	CPUUserMs                  int64
	CPUSystemMs                int64
	CPUTotalMs                 int64
	CPUPercent                 float64
	MemoryHeapAllocBytes       int64
	MemoryHeapAllocDeltaBytes  int64
	MemoryRSSMaxBytes          int64
	MemoryRSSMaxDeltaBytes     int64
	MemoryTotalAllocDeltaBytes int64
	MemoryMallocsDelta         int64
	MemoryFreesDelta           int64
	MemoryNumGC                int
	Goroutines                 int
}

type ShutdownFunc func(context.Context) error

type OperationSample struct {
	startedAt time.Time
	resource  resourceSnapshot
}

func StartOperation() OperationSample {
	if !Enabled() {
		return OperationSample{}
	}
	return OperationSample{
		startedAt: time.Now(),
		resource:  readResourceSnapshot(),
	}
}

func (sample OperationSample) Finish(stats OperationStats) OperationStats {
	if sample.startedAt.IsZero() {
		return stats
	}
	if stats.DurationMs == 0 {
		stats.DurationMs = time.Since(sample.startedAt).Milliseconds()
	}
	end := readResourceSnapshot()
	stats.CPUUserMs = end.userCPUms - sample.resource.userCPUms
	stats.CPUSystemMs = end.systemCPUms - sample.resource.systemCPUms
	stats.CPUTotalMs = stats.CPUUserMs + stats.CPUSystemMs
	if stats.DurationMs > 0 {
		stats.CPUPercent = float64(stats.CPUTotalMs) / float64(stats.DurationMs) * 100
	}
	stats.MemoryHeapAllocBytes = int64(end.heapAllocBytes)
	stats.MemoryHeapAllocDeltaBytes = int64(end.heapAllocBytes) - int64(sample.resource.heapAllocBytes)
	stats.MemoryRSSMaxBytes = end.rssMaxBytes
	stats.MemoryRSSMaxDeltaBytes = end.rssMaxBytes - sample.resource.rssMaxBytes
	stats.MemoryTotalAllocDeltaBytes = int64(end.totalAllocBytes - sample.resource.totalAllocBytes)
	stats.MemoryMallocsDelta = int64(end.mallocs - sample.resource.mallocs)
	stats.MemoryFreesDelta = int64(end.frees - sample.resource.frees)
	stats.MemoryNumGC = int(end.numGC)
	stats.Goroutines = end.goroutines
	return stats
}

func (sample OperationSample) Record(ctx context.Context, name string, stats OperationStats) {
	RecordOperation(ctx, name, sample.Finish(stats))
}

type resourceSnapshot struct {
	userCPUms       int64
	systemCPUms     int64
	heapAllocBytes  uint64
	totalAllocBytes uint64
	mallocs         uint64
	frees           uint64
	numGC           uint32
	rssMaxBytes     int64
	goroutines      int
}

func readResourceSnapshot() resourceSnapshot {
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)
	return resourceSnapshot{
		userCPUms:       currentRusageCPUms(func(usage *syscall.Rusage) syscall.Timeval { return usage.Utime }),
		systemCPUms:     currentRusageCPUms(func(usage *syscall.Rusage) syscall.Timeval { return usage.Stime }),
		heapAllocBytes:  mem.HeapAlloc,
		totalAllocBytes: mem.TotalAlloc,
		mallocs:         mem.Mallocs,
		frees:           mem.Frees,
		numGC:           mem.NumGC,
		rssMaxBytes:     currentMaxRSSBytes(),
		goroutines:      runtime.NumGoroutine(),
	}
}

func currentRusageCPUms(value func(*syscall.Rusage) syscall.Timeval) int64 {
	var usage syscall.Rusage
	if err := syscall.Getrusage(syscall.RUSAGE_SELF, &usage); err != nil {
		return 0
	}
	timeval := value(&usage)
	return int64(timeval.Sec)*1000 + int64(timeval.Usec)/1000
}

func currentMaxRSSBytes() int64 {
	var usage syscall.Rusage
	if err := syscall.Getrusage(syscall.RUSAGE_SELF, &usage); err != nil {
		return 0
	}
	value := usage.Maxrss
	if runtime.GOOS == "linux" {
		return value * 1024
	}
	return value
}
