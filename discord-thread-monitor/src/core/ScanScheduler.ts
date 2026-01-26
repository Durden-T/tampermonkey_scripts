import { TIMING } from '../constants';

export enum ScanPriority {
  HIGH = 3,
  NORMAL = 2,
  LOW = 1,
}

interface ScheduledTask {
  callback: () => void;
  priority: ScanPriority;
}

export class ScanScheduler {
  private lastScanTime = 0;
  private pendingTimeout: ReturnType<typeof setTimeout> | null = null;
  private scheduledTask: ScheduledTask | null = null;

  schedule(callback: () => void, priority = ScanPriority.NORMAL, delayMs = 0): void {
    const now = Date.now();
    const timeSinceLastScan = now - this.lastScanTime;
    const effectiveDelay =
      delayMs || (priority === ScanPriority.HIGH ? 0 : TIMING.NAV_SCAN_DELAY_MS);

    if (timeSinceLastScan < TIMING.MIN_SCAN_GAP_MS) {
      if (!this.scheduledTask || priority > this.scheduledTask.priority) {
        this.scheduledTask = { callback, priority };
        if (this.pendingTimeout) {
          clearTimeout(this.pendingTimeout);
        }
        this.pendingTimeout = setTimeout(() => {
          this.executeScan();
        }, TIMING.MIN_SCAN_GAP_MS - timeSinceLastScan);
      }
      return;
    }

    // Clear any pending delayed scan before scheduling new immediate/delayed task
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }

    this.scheduledTask = { callback, priority };

    if (effectiveDelay === 0) {
      this.executeScan();
    } else {
      this.pendingTimeout = setTimeout(() => {
        this.executeScan();
      }, effectiveDelay);
    }
  }

  cancel(): void {
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }
    this.scheduledTask = null;
  }

  private executeScan(): void {
    if (this.scheduledTask) {
      this.lastScanTime = Date.now();
      const { callback } = this.scheduledTask;
      this.scheduledTask = null;
      this.pendingTimeout = null;
      callback();
    }
  }
}
