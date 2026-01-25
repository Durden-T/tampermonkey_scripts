import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThreadItem } from './ThreadItem';
import type { MonitoredThread, TitleChange } from '../types';

// Mock i18n to avoid localStorage issues
vi.mock('../i18n', () => ({
  getTexts: () => ({
    labels: {
      oldTitle: '旧',
      newTitle: '新',
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

describe('ThreadItem', () => {
  let mockOnOpen: ReturnType<typeof vi.fn>;
  let mockOnBlock: ReturnType<typeof vi.fn>;
  let mockOnResume: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnOpen = vi.fn();
    mockOnBlock = vi.fn();
    mockOnResume = vi.fn();
  });

  const mockThread: MonitoredThread = {
    id: 'thread-123',
    currentTitle: 'Current Thread Title',
    url: 'https://discord.com/channels/123/456/thread-123',
    parentChannel: 'general',
    firstSeenAt: Date.now() - 3600000, // 1 hour ago
  };

  const mockChange: TitleChange = {
    threadId: 'thread-123',
    oldTitle: 'Old Thread Title',
    newTitle: 'Current Thread Title',
    changedAt: Date.now() - 60000, // 1 minute ago
    seen: false,
  };

  describe('Rendering', () => {
    it('should render thread title when no change is provided', () => {
      render(
        <ThreadItem
          thread={mockThread}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      expect(screen.getByText('Current Thread Title')).toBeInTheDocument();
      expect(screen.queryByText('Old Thread Title')).not.toBeInTheDocument();
    });

    it('should render change information when change is provided', () => {
      render(
        <ThreadItem
          thread={mockThread}
          change={mockChange}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      expect(screen.getByText('Old Thread Title')).toBeInTheDocument();
      expect(screen.getByText('Current Thread Title')).toBeInTheDocument();
    });

    it('should render parent channel when available', () => {
      render(
        <ThreadItem
          thread={mockThread}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      expect(screen.getByText('general')).toBeInTheDocument();
    });

    it('should not render parent channel when empty', () => {
      const threadWithoutChannel = { ...mockThread, parentChannel: '' };

      render(
        <ThreadItem
          thread={threadWithoutChannel}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      expect(screen.queryByText('general')).not.toBeInTheDocument();
    });

    it('should render time for change when change is provided', () => {
      render(
        <ThreadItem
          thread={mockThread}
          change={mockChange}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      // The formatTime function should output something like "1m ago"
      expect(screen.getByText(/.*m ago/)).toBeInTheDocument();
    });

    it('should apply unseen class when change is not seen', () => {
      const { container } = render(
        <ThreadItem
          thread={mockThread}
          change={mockChange}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      const threadItem = container.querySelector('.thread-item');
      expect(threadItem).toHaveClass('unseen');
    });

    it('should not apply unseen class when change is seen', () => {
      const seenChange = { ...mockChange, seen: true };

      const { container } = render(
        <ThreadItem
          thread={mockThread}
          change={seenChange}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      const threadItem = container.querySelector('.thread-item');
      expect(threadItem).not.toHaveClass('unseen');
    });

    it('should not apply unseen class when no change is provided', () => {
      const { container } = render(
        <ThreadItem
          thread={mockThread}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      const threadItem = container.querySelector('.thread-item');
      expect(threadItem).not.toHaveClass('unseen');
    });
  });

  describe('Actions - Normal mode', () => {
    it('should render Open and Block buttons when not blacklisted', () => {
      render(
        <ThreadItem
          thread={mockThread}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      expect(screen.getByText('打开')).toBeInTheDocument(); // Open in Chinese
      expect(screen.getByText('屏蔽')).toBeInTheDocument(); // Block in Chinese
      expect(screen.queryByText('恢复')).not.toBeInTheDocument(); // Resume should not be present
    });

    it('should call onOpen when Open button is clicked', () => {
      render(
        <ThreadItem
          thread={mockThread}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      const openButton = screen.getByText('打开');
      openButton.click();

      expect(mockOnOpen).toHaveBeenCalledWith(mockThread.url, mockThread.id);
      expect(mockOnBlock).not.toHaveBeenCalled();
    });

    it('should call onBlock when Block button is clicked', () => {
      const { container } = render(
        <ThreadItem
          thread={mockThread}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      // Find the block button specifically in the thread-actions
      const threadActions = container.querySelector('.thread-actions');
      expect(threadActions).toBeInTheDocument();

      const buttons = threadActions?.querySelectorAll('button');
      expect(buttons).toHaveLength(2); // Should have Open and Block buttons

      // The second button should be the Block button
      const blockButton = buttons![1];
      expect(blockButton?.textContent).toBe('屏蔽');

      blockButton.click();

      expect(mockOnBlock).toHaveBeenCalledWith(mockThread.id);
      expect(mockOnOpen).not.toHaveBeenCalled();
    });
  });

  describe('Actions - Blacklisted mode', () => {
    it('should render Resume button when blacklisted', () => {
      render(
        <ThreadItem
          thread={mockThread}
          isBlacklisted={true}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      expect(screen.getByText('恢复')).toBeInTheDocument(); // Resume in Chinese
      expect(screen.queryByText('打开')).not.toBeInTheDocument();
      expect(screen.queryByText('屏蔽')).not.toBeInTheDocument();
    });

    it('should call onResume when Resume button is clicked', () => {
      const { container } = render(
        <ThreadItem
          thread={mockThread}
          isBlacklisted={true}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      // Find the resume button specifically in the thread-actions
      const threadActions = container.querySelector('.thread-actions');
      expect(threadActions).toBeInTheDocument();

      const buttons = threadActions?.querySelectorAll('button');
      expect(buttons).toHaveLength(1); // Should have only Resume button

      const resumeButton = buttons![0];
      expect(resumeButton?.textContent).toBe('恢复');

      resumeButton.click();

      expect(mockOnResume).toHaveBeenCalledWith(mockThread.id);
      expect(mockOnOpen).not.toHaveBeenCalled();
      expect(mockOnBlock).not.toHaveBeenCalled();
    });
  });

  describe('Layout structure', () => {
    it('should have thread-info and thread-actions containers', () => {
      const { container } = render(
        <ThreadItem
          thread={mockThread}
          change={mockChange}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      expect(container.querySelector('.thread-info')).toBeInTheDocument();
      expect(container.querySelector('.thread-actions')).toBeInTheDocument();
    });

    it('should render change rows with proper labels', () => {
      render(
        <ThreadItem
          thread={mockThread}
          change={mockChange}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      expect(screen.getByText('旧')).toBeInTheDocument(); // Old label in Chinese
      expect(screen.getByText('新')).toBeInTheDocument(); // New label in Chinese
    });

    it('should render meta information correctly', () => {
      render(
        <ThreadItem
          thread={mockThread}
          change={mockChange}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      // Check for meta container with time and channel
      const metaContainer = document.querySelector('.thread-meta');
      expect(metaContainer).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle thread without parent channel gracefully', () => {
      const threadWithoutChannel = { ...mockThread, parentChannel: '' };

      render(
        <ThreadItem
          thread={threadWithoutChannel}
          change={mockChange}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      // Should still render normally
      expect(screen.getByText('Current Thread Title')).toBeInTheDocument();
      expect(document.querySelector('.thread-meta')).toBeInTheDocument();
    });

    it('should handle isBlacklisted false explicitly', () => {
      render(
        <ThreadItem
          thread={mockThread}
          isBlacklisted={false}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      expect(screen.getByText('打开')).toBeInTheDocument();
      expect(screen.getByText('屏蔽')).toBeInTheDocument();
    });

    it('should handle undefined change parameter', () => {
      render(
        <ThreadItem
          thread={mockThread}
          change={undefined}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      expect(screen.getByText('Current Thread Title')).toBeInTheDocument();
      expect(screen.queryByText('旧')).not.toBeInTheDocument();
    });
  });
});
