const PERSISTENT_ERROR_THRESHOLD = 3;

class ScanStatusTracker {
  consecutiveErrors = 0;

  recordSuccess(): void {
    this.consecutiveErrors = 0;
  }

  recordError(error: unknown): void {
    this.consecutiveErrors++;
    console.error('[Discord Thread Monitor] Scan error:', error);
    if (this.hasPersistentError()) {
      console.warn(
        `[Discord Thread Monitor] ${this.consecutiveErrors} consecutive scan failures. ` +
          'The monitor may not be detecting changes.'
      );
    }
  }

  hasPersistentError(): boolean {
    return this.consecutiveErrors >= PERSISTENT_ERROR_THRESHOLD;
  }
}

export const scanStatus = new ScanStatusTracker();
