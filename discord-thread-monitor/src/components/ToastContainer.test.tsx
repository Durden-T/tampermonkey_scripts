import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastContainer } from './ToastContainer';
import type { TitleChange, MonitoredThread } from '../types';

// Mock i18n to avoid localStorage issues
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

  describe('Rendering', () => {
    it('should render empty container when there are no changes', () => {
      const { container } = render(
        <ToastContainer
          changes={[]}
          threads={{}}
          onDismiss={mockOnDismiss}
          onNavigate={mockOnNavigate}
        />
      );

      // ToastContainer always renders the container div, but it should be empty
      const toastContainer = container.querySelector('.toast-container');
      expect(toastContainer).toBeInTheDocument();
      expect(toastContainer?.children.length).toBe(0);
    });

    it('should render toast when there are changes', () => {
      const { container } = render(
        <ToastContainer
          changes={[mockChange]}
          threads={{ 'thread-1': mockThread }}
          onDismiss={mockOnDismiss}
          onNavigate={mockOnNavigate}
        />
      );

      expect(container.querySelector('.toast-container')).toBeInTheDocument();
      expect(container.querySelector('.toast')).toBeInTheDocument();
      expect(screen.getByText('Original Thread Title')).toBeInTheDocument();
      expect(screen.getByText('Updated Thread Title')).toBeInTheDocument();
    });

    it('should render multiple toasts for multiple changes', () => {
      const change2: TitleChange = {
        threadId: 'thread-2',
        oldTitle: 'Old Title 2',
        newTitle: 'New Title 2',
        changedAt: Date.now(),
        seen: false,
      };

      const thread2: MonitoredThread = {
        id: 'thread-2',
        currentTitle: 'New Title 2',
        url: 'https://discord.com/channels/123/456/thread-2',
        parentChannel: 'general',
        firstSeenAt: Date.now(),
      };

      const { container } = render(
        <ToastContainer
          changes={[mockChange, change2]}
          threads={{ 'thread-1': mockThread, 'thread-2': thread2 }}
          onDismiss={mockOnDismiss}
          onNavigate={mockOnNavigate}
        />
      );

      const toasts = container.querySelectorAll('.toast');
      expect(toasts.length).toBe(2);
    });

    it('should display the correct title text', () => {
      render(
        <ToastContainer
          changes={[mockChange]}
          threads={{ 'thread-1': mockThread }}
          onDismiss={mockOnDismiss}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText('Title Updated')).toBeInTheDocument();
    });
  });

  describe('Toast behavior', () => {
    it('should automatically dismiss toast after duration', () => {
      const { container } = render(
        <ToastContainer
          changes={[mockChange]}
          threads={{ 'thread-1': mockThread }}
          onDismiss={mockOnDismiss}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText('Original Thread Title')).toBeInTheDocument();
      expect(container.querySelector('.toast')).toBeInTheDocument();

      // Fast-forward through the 5 second duration
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Toast should be dismissed and removed
      expect(mockOnDismiss).toHaveBeenCalledWith('thread-1');
      expect(container.querySelector('.toast')).not.toBeInTheDocument();
    });

    it('should not add duplicate toasts for the same change', () => {
      const { container, rerender } = render(
        <ToastContainer
          changes={[mockChange]}
          threads={{ 'thread-1': mockThread }}
          onDismiss={mockOnDismiss}
          onNavigate={mockOnNavigate}
        />
      );

      let toasts = container.querySelectorAll('.toast');
      expect(toasts.length).toBe(1);

      // Re-render with the same change
      rerender(
        <ToastContainer
          changes={[mockChange]}
          threads={{ 'thread-1': mockThread }}
          onDismiss={mockOnDismiss}
          onNavigate={mockOnNavigate}
        />
      );

      toasts = container.querySelectorAll('.toast');
      expect(toasts.length).toBe(1);
    });

    it('should add new toast when new change arrives', () => {
      const { container, rerender } = render(
        <ToastContainer
          changes={[mockChange]}
          threads={{ 'thread-1': mockThread }}
          onDismiss={mockOnDismiss}
          onNavigate={mockOnNavigate}
        />
      );

      let toasts = container.querySelectorAll('.toast');
      expect(toasts.length).toBe(1);

      const newChange: TitleChange = {
        threadId: 'thread-2',
        oldTitle: 'Old Title 2',
        newTitle: 'New Title 2',
        changedAt: Date.now(),
        seen: false,
      };

      const newThread: MonitoredThread = {
        id: 'thread-2',
        currentTitle: 'New Title 2',
        url: 'https://discord.com/channels/123/456/thread-2',
        parentChannel: 'general',
        firstSeenAt: Date.now(),
      };

      // Re-render with additional change
      rerender(
        <ToastContainer
          changes={[mockChange, newChange]}
          threads={{ 'thread-1': mockThread, 'thread-2': newThread }}
          onDismiss={mockOnDismiss}
          onNavigate={mockOnNavigate}
        />
      );

      toasts = container.querySelectorAll('.toast');
      expect(toasts.length).toBe(2);
    });
  });

  describe('User interactions', () => {
    it('should call onDismiss when close button is clicked', () => {
      render(
        <ToastContainer
          changes={[mockChange]}
          threads={{ 'thread-1': mockThread }}
          onDismiss={mockOnDismiss}
          onNavigate={mockOnNavigate}
        />
      );

      const closeButton = screen.getByRole('button', { name: '' });
      closeButton.click();

      expect(mockOnDismiss).toHaveBeenCalledWith('thread-1');
    });

    it('should call onNavigate when toast content is clicked', () => {
      render(
        <ToastContainer
          changes={[mockChange]}
          threads={{ 'thread-1': mockThread }}
          onDismiss={mockOnDismiss}
          onNavigate={mockOnNavigate}
        />
      );

      const toastContent = screen.getByText('Updated Thread Title');
      toastContent.click();

      expect(mockOnNavigate).toHaveBeenCalledWith(mockThread.url, 'thread-1');
    });

    it('should stop propagation when close button is clicked', () => {
      render(
        <ToastContainer
          changes={[mockChange]}
          threads={{ 'thread-1': mockThread }}
          onDismiss={mockOnDismiss}
          onNavigate={mockOnNavigate}
        />
      );

      const closeButton = screen.getByRole('button', { name: '' });
      closeButton.click();

      // Should only call onDismiss, not onNavigate
      expect(mockOnDismiss).toHaveBeenCalledWith('thread-1');
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('should handle missing thread gracefully', () => {
      render(
        <ToastContainer
          changes={[mockChange]}
          threads={{}} // No thread provided
          onDismiss={mockOnDismiss}
          onNavigate={mockOnNavigate}
        />
      );

      const toastContent = screen.getByText('Updated Thread Title');
      toastContent.click();

      // Should call onNavigate with empty URL
      expect(mockOnNavigate).toHaveBeenCalledWith('', 'thread-1');
    });
  });

  describe('Timer cleanup', () => {
    it('should clear timers on unmount', () => {
      const { unmount } = render(
        <ToastContainer
          changes={[mockChange]}
          threads={{ 'thread-1': mockThread }}
          onDismiss={mockOnDismiss}
          onNavigate={mockOnNavigate}
        />
      );

      unmount();

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // onDismiss should not be called since component unmounted
      expect(mockOnDismiss).not.toHaveBeenCalled();
    });
  });

  describe('Toast dismissal', () => {
    it('should remove toast immediately when close button is clicked', () => {
      const { container } = render(
        <ToastContainer
          changes={[mockChange]}
          threads={{ 'thread-1': mockThread }}
          onDismiss={mockOnDismiss}
          onNavigate={mockOnNavigate}
        />
      );

      expect(container.querySelector('.toast')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: '' });
      act(() => {
        closeButton.click();
      });

      expect(container.querySelector('.toast')).not.toBeInTheDocument();
    });
  });
});
