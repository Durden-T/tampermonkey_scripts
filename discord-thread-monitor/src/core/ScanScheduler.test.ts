import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScanScheduler, ScanPriority } from './ScanScheduler';
import { TIMING } from '../constants';

describe('ScanScheduler', () => {
  let scheduler: ScanScheduler;

  beforeEach(() => {
    vi.useFakeTimers();
    scheduler = new ScanScheduler();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('schedule', () => {
    it('should execute callback after delay', () => {
      const callback = vi.fn();
      scheduler.schedule(callback, ScanPriority.NORMAL);

      expect(callback).not.toHaveBeenCalled();
      vi.advanceTimersByTime(TIMING.NAV_SCAN_DELAY_MS);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should debounce multiple scheduled calls of same priority', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      scheduler.schedule(callback1, ScanPriority.NORMAL);
      vi.advanceTimersByTime(500);
      scheduler.schedule(callback2, ScanPriority.NORMAL);

      vi.advanceTimersByTime(TIMING.NAV_SCAN_DELAY_MS);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should respect minimum scan gap', () => {
      const callback = vi.fn();
      scheduler.schedule(callback, ScanPriority.HIGH);
      expect(callback).toHaveBeenCalledTimes(1);

      scheduler.schedule(callback, ScanPriority.NORMAL);
      vi.advanceTimersByTime(TIMING.NAV_SCAN_DELAY_MS);
      expect(callback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(TIMING.MIN_SCAN_GAP_MS - TIMING.NAV_SCAN_DELAY_MS);
      expect(callback).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(TIMING.MIN_SCAN_GAP_MS);
      scheduler.schedule(callback, ScanPriority.NORMAL);
      vi.advanceTimersByTime(TIMING.NAV_SCAN_DELAY_MS);
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should allow custom delay', () => {
      const callback = vi.fn();
      const customDelay = 5000;

      scheduler.schedule(callback, ScanPriority.NORMAL, customDelay);
      vi.advanceTimersByTime(TIMING.NAV_SCAN_DELAY_MS);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(customDelay - TIMING.NAV_SCAN_DELAY_MS);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should execute HIGH priority immediately', () => {
      const callback = vi.fn();
      scheduler.schedule(callback, ScanPriority.HIGH);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('priority handling', () => {
    it('should allow HIGH priority to interrupt NORMAL priority', () => {
      const normalCallback = vi.fn();
      const highCallback = vi.fn();

      scheduler.schedule(normalCallback, ScanPriority.NORMAL);
      vi.advanceTimersByTime(500);

      scheduler.schedule(highCallback, ScanPriority.HIGH);
      expect(highCallback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(TIMING.NAV_SCAN_DELAY_MS);
      expect(normalCallback).not.toHaveBeenCalled();
    });

    it('should not allow NORMAL priority to override HIGH priority', () => {
      const highCallback = vi.fn();
      const normalCallback = vi.fn();

      scheduler.schedule(highCallback, ScanPriority.HIGH);
      expect(highCallback).toHaveBeenCalledTimes(1);

      scheduler.schedule(normalCallback, ScanPriority.NORMAL);
      vi.advanceTimersByTime(TIMING.MIN_SCAN_GAP_MS - 1);
      expect(normalCallback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(normalCallback).toHaveBeenCalledTimes(1);
    });

    it('should queue HIGH priority scan when within minimum gap', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      scheduler.schedule(callback1, ScanPriority.HIGH);
      expect(callback1).toHaveBeenCalledTimes(1);

      scheduler.schedule(callback2, ScanPriority.HIGH);
      expect(callback2).not.toHaveBeenCalled();

      vi.advanceTimersByTime(TIMING.MIN_SCAN_GAP_MS);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel', () => {
    it('should cancel pending scan', () => {
      const callback = vi.fn();
      scheduler.schedule(callback, ScanPriority.NORMAL);

      scheduler.cancel();
      vi.advanceTimersByTime(TIMING.NAV_SCAN_DELAY_MS);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should clear scheduled callback', () => {
      const callback = vi.fn();
      scheduler.schedule(callback, ScanPriority.NORMAL);
      scheduler.cancel();

      vi.advanceTimersByTime(TIMING.MIN_SCAN_GAP_MS + TIMING.NAV_SCAN_DELAY_MS);
      scheduler.schedule(callback, ScanPriority.HIGH);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('concurrent operations', () => {
    it('should handle rapid schedule calls correctly', () => {
      const callback = vi.fn();

      for (let i = 0; i < 10; i++) {
        scheduler.schedule(callback, ScanPriority.NORMAL);
        vi.advanceTimersByTime(100);
      }

      vi.advanceTimersByTime(TIMING.NAV_SCAN_DELAY_MS);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle schedule-cancel-schedule pattern', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      scheduler.schedule(callback1, ScanPriority.NORMAL);
      scheduler.cancel();
      scheduler.schedule(callback2, ScanPriority.NORMAL);

      vi.advanceTimersByTime(TIMING.NAV_SCAN_DELAY_MS);
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });
});
