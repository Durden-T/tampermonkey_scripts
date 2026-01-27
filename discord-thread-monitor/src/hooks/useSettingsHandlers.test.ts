import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettingsHandlers } from './useSettingsHandlers';
import type { ThreadStore } from '../core/ThreadStore';

describe('useSettingsHandlers', () => {
  let mockStore: ThreadStore;
  let mockRefreshData: () => void;
  let mockSetRetentionDays: (value: number) => void;

  beforeEach(() => {
    mockStore = {
      setRetentionDays: vi.fn(),
      getRetentionDays: vi.fn(() => 30),
      clearChanges: vi.fn(),
    } as unknown as ThreadStore;

    mockRefreshData = vi.fn();
    mockSetRetentionDays = vi.fn();
  });

  it('should handle normal retention days change', () => {
    const { result } = renderHook(() =>
      useSettingsHandlers({
        store: mockStore,
        refreshData: mockRefreshData,
        setRetentionDays: mockSetRetentionDays,
      })
    );

    act(() => {
      result.current.handleRetentionChange(60);
    });

    expect(mockStore.setRetentionDays).toHaveBeenCalledWith(60);
    expect(mockSetRetentionDays).toHaveBeenCalledWith(60);
    expect(mockRefreshData).toHaveBeenCalled();
    expect(mockStore.clearChanges).not.toHaveBeenCalled();
  });

  it('should clear all changes when retention days is -1', () => {
    const { result } = renderHook(() =>
      useSettingsHandlers({
        store: mockStore,
        refreshData: mockRefreshData,
        setRetentionDays: mockSetRetentionDays,
      })
    );

    act(() => {
      result.current.handleRetentionChange(-1);
    });

    expect(mockStore.clearChanges).toHaveBeenCalled();
    expect(mockStore.setRetentionDays).toHaveBeenCalledWith(0);
    expect(mockSetRetentionDays).toHaveBeenCalledWith(0);
    expect(mockRefreshData).toHaveBeenCalled();
  });

  it('should set retention to 0 (permanent) after clearing all changes', () => {
    const { result } = renderHook(() =>
      useSettingsHandlers({
        store: mockStore,
        refreshData: mockRefreshData,
        setRetentionDays: mockSetRetentionDays,
      })
    );

    act(() => {
      result.current.handleRetentionChange(-1);
    });

    expect(mockStore.setRetentionDays).toHaveBeenCalledWith(0);
    expect(mockSetRetentionDays).toHaveBeenCalledWith(0);
  });
});
