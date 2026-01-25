import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThreadHandlers } from './useThreadHandlers';
import type { ThreadStore } from '../core/ThreadStore';

describe('useThreadHandlers', () => {
  let mockStore: Partial<ThreadStore>;
  let mockRefreshData: () => void;

  beforeEach(() => {
    mockStore = {
      markChangeSeen: vi.fn(),
      addToBlacklist: vi.fn(),
      removeFromBlacklist: vi.fn(),
    };

    mockRefreshData = vi.fn();
  });

  describe('handleOpen', () => {
    let pushStateSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      pushStateSpy = vi.spyOn(history, 'pushState');
    });

    afterEach(() => {
      pushStateSpy.mockRestore();
    });

    it('should mark change as seen when opening thread', () => {
      const { result } = renderHook(() =>
        useThreadHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
        })
      );

      act(() => {
        result.current.handleOpen('https://discord.com/thread/123', 'thread-123');
      });

      expect(mockStore.markChangeSeen).toHaveBeenCalledWith('thread-123');
    });

    it('should refresh data when opening thread', () => {
      const { result } = renderHook(() =>
        useThreadHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
        })
      );

      act(() => {
        result.current.handleOpen('https://discord.com/thread/123', 'thread-123');
      });

      expect(mockRefreshData).toHaveBeenCalledTimes(1);
    });

    it('should navigate to the provided URL using history.pushState', () => {
      const { result } = renderHook(() =>
        useThreadHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
        })
      );

      const testUrl = 'https://discord.com/channels/123/456';

      act(() => {
        result.current.handleOpen(testUrl, 'thread-123');
      });

      expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/channels/123/456');
    });

    it('should handle different thread IDs', () => {
      const { result } = renderHook(() =>
        useThreadHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
        })
      );

      act(() => {
        result.current.handleOpen('https://discord.com/thread/456', 'thread-456');
      });

      expect(mockStore.markChangeSeen).toHaveBeenCalledWith('thread-456');
    });

    it('should maintain stable callback reference', () => {
      const { result, rerender } = renderHook(() =>
        useThreadHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
        })
      );

      const firstCallback = result.current.handleOpen;

      rerender({
        store: mockStore as ThreadStore,
        refreshData: mockRefreshData,
      });

      expect(result.current.handleOpen).toBe(firstCallback);
    });
  });

  describe('handleBlock', () => {
    it('should add thread to blacklist', () => {
      const { result } = renderHook(() =>
        useThreadHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
        })
      );

      act(() => {
        result.current.handleBlock('thread-123');
      });

      expect(mockStore.addToBlacklist).toHaveBeenCalledWith('thread-123');
    });

    it('should refresh data after blocking', () => {
      const { result } = renderHook(() =>
        useThreadHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
        })
      );

      act(() => {
        result.current.handleBlock('thread-123');
      });

      expect(mockRefreshData).toHaveBeenCalledTimes(1);
    });

    it('should handle different thread IDs', () => {
      const { result } = renderHook(() =>
        useThreadHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
        })
      );

      act(() => {
        result.current.handleBlock('thread-789');
      });

      expect(mockStore.addToBlacklist).toHaveBeenCalledWith('thread-789');
    });

    it('should maintain stable callback reference', () => {
      const { result, rerender } = renderHook(() =>
        useThreadHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
        })
      );

      const firstCallback = result.current.handleBlock;

      rerender({
        store: mockStore as ThreadStore,
        refreshData: mockRefreshData,
      });

      expect(result.current.handleBlock).toBe(firstCallback);
    });
  });

  describe('handleResume', () => {
    it('should remove thread from blacklist', () => {
      const { result } = renderHook(() =>
        useThreadHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
        })
      );

      act(() => {
        result.current.handleResume('thread-123');
      });

      expect(mockStore.removeFromBlacklist).toHaveBeenCalledWith('thread-123');
    });

    it('should refresh data after resuming', () => {
      const { result } = renderHook(() =>
        useThreadHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
        })
      );

      act(() => {
        result.current.handleResume('thread-123');
      });

      expect(mockRefreshData).toHaveBeenCalledTimes(1);
    });

    it('should handle different thread IDs', () => {
      const { result } = renderHook(() =>
        useThreadHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
        })
      );

      act(() => {
        result.current.handleResume('thread-789');
      });

      expect(mockStore.removeFromBlacklist).toHaveBeenCalledWith('thread-789');
    });

    it('should maintain stable callback reference', () => {
      const { result, rerender } = renderHook(() =>
        useThreadHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
        })
      );

      const firstCallback = result.current.handleResume;

      rerender({
        store: mockStore as ThreadStore,
        refreshData: mockRefreshData,
      });

      expect(result.current.handleResume).toBe(firstCallback);
    });
  });
});
