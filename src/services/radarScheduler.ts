export interface SchedulableScanConfig {
  id: string;
  is_active: boolean;
  scan_interval_hours: number;
  last_scanned_at?: string;
}

export const RADAR_SCHEDULER_POLL_MS = 15 * 60 * 1000;

export function getDueScanConfigIds(
  configs: SchedulableScanConfig[],
  now = Date.now(),
): string[] {
  return configs
    .filter((config) => {
      if (!config.is_active) return false;
      const lastScan = config.last_scanned_at
        ? Date.parse(config.last_scanned_at)
        : Number.NaN;
      if (!Number.isFinite(lastScan)) return true;
      const intervalHours = Math.max(config.scan_interval_hours || 24, 1);
      return now - lastScan >= intervalHours * 60 * 60 * 1000;
    })
    .map((config) => config.id);
}

export function startRadarScheduler(
  runDueScans: () => Promise<void>,
  pollIntervalMs = RADAR_SCHEDULER_POLL_MS,
): () => void {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runDueScans();
    } catch (error) {
      console.error("Scheduled radar scan failed:", error);
    } finally {
      running = false;
    }
  };

  void tick();
  const timer = setInterval(() => void tick(), pollIntervalMs);
  return () => clearInterval(timer);
}
