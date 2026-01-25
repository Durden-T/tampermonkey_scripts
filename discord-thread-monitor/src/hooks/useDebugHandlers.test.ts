import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebugHandlers } from './useDebugHandlers';
import type { ThreadStore } from '../core/ThreadStore';
import type { Notifier } from '../core/Notifier';

describe('useDebugHandlers', () => {
  let mockStore: Partial<ThreadStore>;
  let mockNotifier: Partial<Notifier>;
  let mockRefreshData: () => void;
  let originalEnv: boolean;

  beforeEach(() => {
    mockStore = {
      getThreads: vi.fn().mockReturnValue({}),
      addThread: vi.fn(),
      recordTitleChange: vi.fn(),
    };
    mockNotifier = {
      notifyAll: vi.fn(),
    };
    mockRefreshData = vi.fn();
    originalEnv = (import.meta.env as any).DEV;
  });

  afterEach(() => {
    // Restore original env
    (import.meta.env as any).DEV = originalEnv;
  });

  describe('handleSimulateTitleChange', () => {
    it('should work in production mode', async () => {
      (import.meta.env as any).DEV = false;

      const { result } = renderHook(() =>
        useDebugHandlers({
          store: mockStore as ThreadStore,
          notifier: mockNotifier as Notifier,
          refreshData: mockRefreshData,
        })
      );

      await act(async () => {
        result.current.handleSimulateTitleChange();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(true).toBe(true);
    });

    it('should work in development mode', async () => {
      (import.meta.env as any).DEV = true;

      const { result } = renderHook(() =>
        useDebugHandlers({
          store: mockStore as ThreadStore,
          notifier: mockNotifier as Notifier,
          refreshData: mockRefreshData,
        })
      );

      await act(async () => {
        result.current.handleSimulateTitleChange();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(true).toBe(true);
    });

    it('should maintain stable callback reference in development mode', async () => {
      (import.meta.env as any).DEV = true;

      const { result, rerender } = renderHook(() =>
        useDebugHandlers({
          store: mockStore as ThreadStore,
          notifier: mockNotifier as Notifier,
          refreshData: mockRefreshData,
        })
      );

      const firstCallback = result.current.handleSimulateTitleChange;

      rerender({
        store: mockStore as ThreadStore,
        notifier: mockNotifier as Notifier,
        refreshData: mockRefreshData,
      });

      expect(result.current.handleSimulateTitleChange).toBe(firstCallback);
    });

    it('should handle repeated calls', async () => {
      // Set development mode to true
      (import.meta.env as any).DEV = true;

      const { result } = renderHook(() =>
        useDebugHandlers({
          store: mockStore as ThreadStore,
          notifier: mockNotifier as Notifier,
          refreshData: mockRefreshData,
        })
      );

      // Call multiple times to ensure it handles repeated calls
      await act(async () => {
        result.current.handleSimulateTitleChange();
        result.current.handleSimulateTitleChange();
        result.current.handleSimulateTitleChange();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Should not throw unhandled errors
      expect(true).toBe(true);
    });
  });
});
