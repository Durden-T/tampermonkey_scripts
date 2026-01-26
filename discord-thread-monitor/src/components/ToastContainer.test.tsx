import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastContainer } from './ToastContainer';
import type { TitleChange, MonitoredThread } from '../types';

vi.mock('../i18n', () => ({
  getTexts: () => ({
    toast: {
      titleUpdated: 'Title Updated',
    },
    labels: {
      oldTitle: 'Old',
      newTitle: 'New',
    },
    actions: {
      open: '打开',
      block: '屏蔽',
      resume: '恢复',
    },
  }),
  formatTime: (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  },
}));

describe('ToastContainer', () => {
  const mockOnDismiss = vi.fn();
  const mockOnNavigate = vi.fn();

  const mockThread: MonitoredThread = {
    id: 'thread-1',
    currentTitle: 'Updated Thread Title',
    url: 'https://discord.com/channels/123/456/thread-1',
    parentChannel: 'general',
    firstSeenAt: Date.now(),
  };

  const mockChange: TitleChange = {
    threadId: 'thread-1',
    oldTitle: 'Original Thread Title',
    newTitle: 'Updated Thread Title',
    changedAt: Date.now(),
    seen: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Toast lifecycle', () => {
    it('should auto-dismiss toast after 10 seconds', () => {
      const { container } = render(
        <ToastContainer
          changes={[mockChange]}
          threads={{ 'thread-1': mockThread }}
          onDismiss={mockOnDismiss}
          onNavigate={mockOnNavigate}
        />
      );

      expect(container.querySelector('.toast')).toBeInTheDocument();
      expect(mockOnDismiss).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(9999);
      });

      expect(mockOnDismiss).not.toHaveBeenCalled();
      expect(container.querySelector('.toast')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(mockOnDismiss).toHaveBeenCalledWith('thread-1');
    });

    it('should not add duplicate toasts for the same change', () => {
      let container: HTMLElement;
      let rerender: ReturnType<typeof render>['rerender'];

      act(() => {
        const result = render(
          <ToastContainer
            changes={[mockChange]}
            threads={{ 'thread-1': mockThread }}
            onDismiss={mockOnDismiss}
            onNavigate={mockOnNavigate}
          />
        );
        container = result.container;
        rerender = result.rerender;
      });

      let toasts = container!.querySelectorAll('.toast');
      expect(toasts.length).toBe(1);

      act(() => {
        rerender!(
          <ToastContainer
            changes={[mockChange]}
            threads={{ 'thread-1': mockThread }}
            onDismiss={mockOnDismiss}
            onNavigate={mockOnNavigate}
          />
        );
      });

      toasts = container!.querySelectorAll('.toast');
      expect(toasts.length).toBe(1);
    });
  });

  describe('User interactions', () => {
    it('should call onDismiss when close button is clicked', () => {
      act(() => {
        render(
          <ToastContainer
            changes={[mockChange]}
            threads={{ 'thread-1': mockThread }}
            onDismiss={mockOnDismiss}
            onNavigate={mockOnNavigate}
          />
        );
      });

      const closeButton = screen.getByRole('button', { name: '' });
      act(() => {
        closeButton.click();
      });

      expect(mockOnDismiss).toHaveBeenCalledWith('thread-1');
    });

    it('should call onNavigate when toast content is clicked', () => {
      act(() => {
        render(
          <ToastContainer
            changes={[mockChange]}
            threads={{ 'thread-1': mockThread }}
            onDismiss={mockOnDismiss}
            onNavigate={mockOnNavigate}
          />
        );
      });

      const toastContent = screen.getByText('Updated Thread Title');
      act(() => {
        toastContent.click();
      });

      expect(mockOnNavigate).toHaveBeenCalledWith(mockThread.url, 'thread-1');
    });

    it('should stop propagation when close button is clicked', () => {
      act(() => {
        render(
          <ToastContainer
            changes={[mockChange]}
            threads={{ 'thread-1': mockThread }}
            onDismiss={mockOnDismiss}
            onNavigate={mockOnNavigate}
          />
        );
      });

      const closeButton = screen.getByRole('button', { name: '' });
      act(() => {
        closeButton.click();
      });

      expect(mockOnDismiss).toHaveBeenCalledWith('thread-1');
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });
  });
});
