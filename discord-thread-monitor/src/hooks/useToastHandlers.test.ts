import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToastHandlers } from './useToastHandlers';
import type { ThreadStore } from '../core/ThreadStore';
import type { TitleChange } from '../types';

describe('useToastHandlers', () => {
  let mockStore: Partial<ThreadStore>;
  let mockRefreshData: () => void;
  let mockSetPendingToasts: React.Dispatch<React.SetStateAction<TitleChange[]>>;

  const mockTitleChange: TitleChange = {
    threadId: 'thread-123',
    threadTitle: 'Test Thread',
    oldTitle: 'Old Title',
    newTitle: 'New Title',
    timestamp: Date.now(),
    channelName: 'General',
    serverId: 'server-456',
    seen: false,
  };

  beforeEach(() => {
    mockStore = {
      markChangeSeen: vi.fn(),
    };

    mockRefreshData = vi.fn();
    mockSetPendingToasts = vi.fn();
  });

  describe('handleToastDismiss', () => {
    it('should filter out the dismissed toast by threadId', () => {
      const { result } = renderHook(() =>
        useToastHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
          setPendingToasts: mockSetPendingToasts,
        })
      );

      const mockSetFn = vi.fn();
      mockSetPendingToasts.mockImplementation(mockSetFn);

      act(() => {
        result.current.handleToastDismiss('thread-123');
      });

      expect(mockSetPendingToasts).toHaveBeenCalledWith(expect.any(Function));

      // Test the state updater function
      const mockPrevToasts = [mockTitleChange, { ...mockTitleChange, threadId: 'thread-456' }];
      const stateUpdater = mockSetPendingToasts.mock.calls[0][0] as (
        prev: TitleChange[]
      ) => TitleChange[];
      const resultToasts = stateUpdater(mockPrevToasts);

      expect(resultToasts).toHaveLength(1);
      expect(resultToasts[0].threadId).toBe('thread-456');
    });

    it('should maintain stable callback reference', () => {
      const { result, rerender } = renderHook(() =>
        useToastHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
          setPendingToasts: mockSetPendingToasts,
        })
      );

      const firstCallback = result.current.handleToastDismiss;

      rerender({
        store: mockStore as ThreadStore,
        refreshData: mockRefreshData,
        setPendingToasts: mockSetPendingToasts,
      });

      expect(result.current.handleToastDismiss).toBe(firstCallback);
    });
  });

  describe('handleToastNavigate', () => {
    const originalLocation = window.location;

    beforeEach(() => {
      // Mock window.location
      delete (window as any).location;
      window.location = {
        href: '',
      } as Location;
    });

    afterEach(() => {
      window.location = originalLocation;
    });

    it('should mark change as seen when navigating', () => {
      const { result } = renderHook(() =>
        useToastHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
          setPendingToasts: mockSetPendingToasts,
        })
      );

      act(() => {
        result.current.handleToastNavigate('https://discord.com/thread/123', 'thread-123');
      });

      expect(mockStore.markChangeSeen).toHaveBeenCalledWith('thread-123');
    });

    it('should refresh data when navigating', () => {
      const { result } = renderHook(() =>
        useToastHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
          setPendingToasts: mockSetPendingToasts,
        })
      );

      act(() => {
        result.current.handleToastNavigate('https://discord.com/thread/123', 'thread-123');
      });

      expect(mockRefreshData).toHaveBeenCalledTimes(1);
    });

    it('should remove the navigated toast from pending toasts', () => {
      const { result } = renderHook(() =>
        useToastHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
          setPendingToasts: mockSetPendingToasts,
        })
      );

      act(() => {
        result.current.handleToastNavigate('https://discord.com/thread/123', 'thread-123');
      });

      expect(mockSetPendingToasts).toHaveBeenCalledWith(expect.any(Function));

      // Test the state updater function
      const mockPrevToasts = [mockTitleChange, { ...mockTitleChange, threadId: 'thread-456' }];
      const stateUpdater = mockSetPendingToasts.mock.calls[0][0] as (
        prev: TitleChange[]
      ) => TitleChange[];
      const resultToasts = stateUpdater(mockPrevToasts);

      expect(resultToasts).toHaveLength(1);
      expect(resultToasts[0].threadId).toBe('thread-456');
    });

    it('should navigate to the provided URL', () => {
      const { result } = renderHook(() =>
        useToastHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
          setPendingToasts: mockSetPendingToasts,
        })
      );

      const testUrl = 'https://discord.com/thread/123';

      act(() => {
        result.current.handleToastNavigate(testUrl, 'thread-123');
      });

      expect(window.location.href).toBe(testUrl);
    });

    it('should maintain stable callback reference', () => {
      const { result, rerender } = renderHook(() =>
        useToastHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
          setPendingToasts: mockSetPendingToasts,
        })
      );

      const firstCallback = result.current.handleToastNavigate;

      rerender({
        store: mockStore as ThreadStore,
        refreshData: mockRefreshData,
        setPendingToasts: mockSetPendingToasts,
      });

      expect(result.current.handleToastNavigate).toBe(firstCallback);
    });
  });
});
