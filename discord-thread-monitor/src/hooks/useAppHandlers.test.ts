import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppHandlers } from './useAppHandlers';
import { ThreadStore } from '../core/ThreadStore';
import { Notifier } from '../core/Notifier';
import type { MonitoredThread, TitleChange } from '../types';

describe('useAppHandlers', () => {
  let store: ThreadStore;
  let notifier: Notifier;
  let refreshData: ReturnType<typeof vi.fn>;
  let setPendingToasts: ReturnType<typeof vi.fn>;
  let setRetentionDays: ReturnType<typeof vi.fn>;
  let performScan: ReturnType<typeof vi.fn>;

  const mockThread: MonitoredThread = {
    id: 'thread-1',
    currentTitle: 'Test Thread',
    url: 'https://discord.com/channels/123/456',
    parentChannel: 'Test Channel',
    firstSeenAt: Date.now(),
  };

  const mockChange: TitleChange = {
    threadId: 'thread-1',
    oldTitle: 'Old Title',
    newTitle: 'New Title',
    changedAt: Date.now(),
    seen: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    global.GM_getValue = vi.fn().mockReturnValue(null);
    global.GM_setValue = vi.fn();

    store = new ThreadStore();
    notifier = new Notifier();
    refreshData = vi.fn();
    setPendingToasts = vi.fn();
    setRetentionDays = vi.fn();
    performScan = vi.fn().mockReturnValue({
      currentThreads: [mockThread],
      changes: [],
    });
  });

  describe('handleScanNow', () => {
    it('should call performScan and refreshData', () => {
      const { result } = renderHook(() =>
        useAppHandlers({
          store,
          notifier,
          refreshData,
          setPendingToasts,
          setRetentionDays,
          performScan,
        })
      );

      act(() => {
        result.current.handleScanNow();
      });

      expect(performScan).toHaveBeenCalled();
      expect(refreshData).toHaveBeenCalled();
    });
  });

  describe('handleClearChanges', () => {
    it('should clear changes and refresh data', () => {
      const clearChangesSpy = vi.spyOn(store, 'clearChanges');

      const { result } = renderHook(() =>
        useAppHandlers({
          store,
          notifier,
          refreshData,
          setPendingToasts,
          setRetentionDays,
          performScan,
        })
      );

      act(() => {
        result.current.handleClearChanges();
      });

      expect(clearChangesSpy).toHaveBeenCalled();
      expect(refreshData).toHaveBeenCalled();
    });
  });

  describe('handleMarkAllRead', () => {
    it('should mark all changes as seen and refresh data', () => {
      const markAllChangesSeenSpy = vi.spyOn(store, 'markAllChangesSeen');

      const { result } = renderHook(() =>
        useAppHandlers({
          store,
          notifier,
          refreshData,
          setPendingToasts,
          setRetentionDays,
          performScan,
        })
      );

      act(() => {
        result.current.handleMarkAllRead();
      });

      expect(markAllChangesSeenSpy).toHaveBeenCalled();
      expect(refreshData).toHaveBeenCalled();
    });
  });

  describe('Thread handlers', () => {
    it('should include thread handling functions', () => {
      const { result } = renderHook(() =>
        useAppHandlers({
          store,
          notifier,
          refreshData,
          setPendingToasts,
          setRetentionDays,
          performScan,
        })
      );

      expect(result.current.handleOpen).toBeDefined();
      expect(result.current.handleBlock).toBeDefined();
      expect(result.current.handleResume).toBeDefined();
      expect(typeof result.current.handleOpen).toBe('function');
      expect(typeof result.current.handleBlock).toBe('function');
      expect(typeof result.current.handleResume).toBe('function');
    });
  });

  describe('Settings handlers', () => {
    it('should include settings handling functions', () => {
      const { result } = renderHook(() =>
        useAppHandlers({
          store,
          notifier,
          refreshData,
          setPendingToasts,
          setRetentionDays,
          performScan,
        })
      );

      expect(result.current.handleRetentionChange).toBeDefined();
      expect(typeof result.current.handleRetentionChange).toBe('function');
    });
  });

  describe('Toast handlers', () => {
    it('should include toast handling functions', () => {
      const { result } = renderHook(() =>
        useAppHandlers({
          store,
          notifier,
          refreshData,
          setPendingToasts,
          setRetentionDays,
          performScan,
        })
      );

      expect(result.current.handleToastDismiss).toBeDefined();
      expect(result.current.handleToastNavigate).toBeDefined();
      expect(typeof result.current.handleToastDismiss).toBe('function');
      expect(typeof result.current.handleToastNavigate).toBe('function');
    });
  });

  describe('Debug handlers', () => {
    it('should include debug handling functions', () => {
      const { result } = renderHook(() =>
        useAppHandlers({
          store,
          notifier,
          refreshData,
          setPendingToasts,
          setRetentionDays,
          performScan,
        })
      );

      expect(result.current.handleSimulateTitleChange).toBeDefined();
      expect(typeof result.current.handleSimulateTitleChange).toBe('function');
    });
  });

  describe('Function stability', () => {
    it('should return stable function references across renders', () => {
      const { result, rerender } = renderHook(() =>
        useAppHandlers({
          store,
          notifier,
          refreshData,
          setPendingToasts,
          setRetentionDays,
          performScan,
        })
      );

      const firstRenderFunctions = {
        handleScanNow: result.current.handleScanNow,
        handleClearChanges: result.current.handleClearChanges,
        handleMarkAllRead: result.current.handleMarkAllRead,
      };

      rerender();

      expect(result.current.handleScanNow).toBe(firstRenderFunctions.handleScanNow);
      expect(result.current.handleClearChanges).toBe(firstRenderFunctions.handleClearChanges);
      expect(result.current.handleMarkAllRead).toBe(firstRenderFunctions.handleMarkAllRead);
    });
  });
});
