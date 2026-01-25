import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThreadList } from './ThreadList';
import type { MonitoredThread, TitleChange, ThreadChangeGroup } from '../types';

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

describe('ThreadList', () => {
  const mockOnOpen = vi.fn();
  const mockOnBlock = vi.fn();
  const mockOnResume = vi.fn();

  const mockThreads: MonitoredThread[] = [
    {
      id: 'thread-1',
      currentTitle: 'Thread 1',
      url: 'https://discord.com/channels/123/456/thread-1',
      parentChannel: 'general',
      firstSeenAt: Date.now() - 3600000,
    },
    {
      id: 'thread-2',
      currentTitle: 'Thread 2',
      url: 'https://discord.com/channels/123/456/thread-2',
      parentChannel: 'random',
      firstSeenAt: Date.now() - 7200000,
    },
  ];

  const mockChanges: TitleChange[] = [
    {
      threadId: 'thread-1',
      oldTitle: 'Old Thread 1',
      newTitle: 'Thread 1',
      changedAt: Date.now() - 60000,
      seen: false,
    },
  ];

  const mockChangeGroups: ThreadChangeGroup[] = [
    {
      threadId: 'thread-1',
      thread: mockThreads[0],
      changes: [mockChanges[0]],
      latestChangeAt: Date.now() - 60000,
      hasUnseen: true,
    },
  ];

  describe('Rendering with threads', () => {
    it('should render list of threads', () => {
      render(
        <ThreadList
          threads={mockThreads}
          emptyMessage="No threads"
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      expect(screen.getByText('Thread 1')).toBeInTheDocument();
      expect(screen.getByText('Thread 2')).toBeInTheDocument();
    });

    it('should render empty message when no threads', () => {
      render(
        <ThreadList
          threads={[]}
          emptyMessage="No threads available"
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      expect(screen.getByText('No threads available')).toBeInTheDocument();
    });

    it('should pass change data to ThreadItem when changes are provided', () => {
      render(
        <ThreadList
          threads={mockThreads}
          changes={mockChanges}
          emptyMessage="No threads"
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      expect(screen.getByText('Old Thread 1')).toBeInTheDocument();
      expect(screen.getByText('Thread 1')).toBeInTheDocument();
    });

    it('should pass isBlacklisted prop to ThreadItem', () => {
      render(
        <ThreadList
          threads={mockThreads}
          isBlacklisted={true}
          emptyMessage="No threads"
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      // Should render resume buttons instead of open/block
      expect(screen.getAllByText('恢复')).toHaveLength(2); // Resume button for each thread
    });
  });

  describe('Rendering with change groups', () => {
    it('should render ThreadChangeGroupItem when changeGroups are provided', () => {
      const { container } = render(
        <ThreadList
          threads={mockThreads}
          changeGroups={mockChangeGroups}
          emptyMessage="No changes"
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      // Should render the thread title from the group
      const titleText = container.querySelector('.title-text');
      expect(titleText).toBeInTheDocument();
      expect(titleText?.textContent).toBe('Thread 1');
    });

    it('should render empty message when changeGroups is empty array', () => {
      render(
        <ThreadList
          threads={mockThreads}
          changeGroups={[]}
          emptyMessage="No changes detected"
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      expect(screen.getByText('No changes detected')).toBeInTheDocument();
    });

    it('should render multiple change groups', () => {
      const multipleGroups: ThreadChangeGroup[] = [
        ...mockChangeGroups,
        {
          threadId: 'thread-2',
          thread: mockThreads[1],
          changes: [
            {
              threadId: 'thread-2',
              oldTitle: 'Old Thread 2',
              newTitle: 'Thread 2',
              changedAt: Date.now() - 120000,
              seen: false,
            },
          ],
          latestChangeAt: Date.now() - 120000,
          hasUnseen: true,
        },
      ];

      const { container } = render(
        <ThreadList
          threads={mockThreads}
          changeGroups={multipleGroups}
          emptyMessage="No changes"
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      // Find all title-text elements
      const titleTexts = container.querySelectorAll('.title-text');
      expect(titleTexts).toHaveLength(2);

      const titles = Array.from(titleTexts).map((el) => el.textContent);
      expect(titles).toContain('Thread 1');
      expect(titles).toContain('Thread 2');
    });
  });

  describe('Priority of rendering modes', () => {
    it('should prioritize changeGroups over threads when both are provided', () => {
      const { container } = render(
        <ThreadList
          threads={mockThreads}
          changes={mockChanges}
          changeGroups={mockChangeGroups}
          emptyMessage="No data"
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      // Should render group items, not regular thread items
      const titleText = container.querySelector('.title-text');
      expect(titleText).toBeInTheDocument();
      expect(titleText?.textContent).toBe('Thread 1');

      // The group should contain change information
      const changeOld = container.querySelector('.change-old');
      expect(changeOld).toBeInTheDocument();
      expect(changeOld?.textContent).toBe('Old Thread 1');
    });

    it('should fall back to threads when changeGroups is not provided', () => {
      render(
        <ThreadList
          threads={mockThreads}
          changes={mockChanges}
          emptyMessage="No data"
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      // Should render regular thread items with changes
      expect(screen.getByText('Thread 1')).toBeInTheDocument();
      expect(screen.getByText('Thread 2')).toBeInTheDocument();
      expect(screen.getByText('Old Thread 1')).toBeInTheDocument();
    });
  });

  describe('Callback propagation', () => {
    it('should pass callbacks to ThreadItem components', () => {
      render(
        <ThreadList
          threads={mockThreads}
          emptyMessage="No threads"
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      const openButtons = screen.getAllByText('打开');
      const blockButtons = screen.getAllByText('屏蔽');

      expect(openButtons).toHaveLength(2);
      expect(blockButtons).toHaveLength(2);

      // Test first thread
      openButtons[0].click();
      expect(mockOnOpen).toHaveBeenCalledWith(mockThreads[0].url, mockThreads[0].id);

      blockButtons[1].click();
      expect(mockOnBlock).toHaveBeenCalledWith(mockThreads[1].id);
    });

    it('should pass callbacks to ThreadChangeGroupItem components', () => {
      render(
        <ThreadList
          threads={mockThreads}
          changeGroups={mockChangeGroups}
          emptyMessage="No changes"
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      const openButtons = screen.getAllByText('打开');
      const blockButtons = screen.getAllByText('屏蔽');

      expect(openButtons).toHaveLength(1);
      expect(blockButtons).toHaveLength(1);

      openButtons[0].click();
      expect(mockOnOpen).toHaveBeenCalledWith(mockThreads[0].url, mockThreads[0].id);

      blockButtons[0].click();
      expect(mockOnBlock).toHaveBeenCalledWith(mockThreads[0].id);
    });

    it('should pass onResume callback correctly in blacklisted mode', () => {
      render(
        <ThreadList
          threads={mockThreads}
          isBlacklisted={true}
          emptyMessage="No threads"
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      const resumeButtons = screen.getAllByText('恢复');
      expect(resumeButtons).toHaveLength(2);

      resumeButtons[0].click();
      expect(mockOnResume).toHaveBeenCalledWith(mockThreads[0].id);

      resumeButtons[1].click();
      expect(mockOnResume).toHaveBeenCalledWith(mockThreads[1].id);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty threads array with changeGroups', () => {
      // Note: This test shows that when threads array is empty but changeGroups
      // contains thread references, those thread references will be used
      const { container } = render(
        <ThreadList
          threads={[]}
          changeGroups={mockChangeGroups}
          emptyMessage="No changes"
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      // The ThreadChangeGroupItem will use the thread from the group
      // Find the title-text element specifically to avoid multiple matches
      const titleText = container.querySelector('.title-text');
      expect(titleText).toBeInTheDocument();
      expect(titleText?.textContent).toBe('Thread 1');
    });

    it('should handle undefined changes parameter', () => {
      render(
        <ThreadList
          threads={mockThreads}
          changes={undefined}
          emptyMessage="No threads"
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      expect(screen.getByText('Thread 1')).toBeInTheDocument();
      expect(screen.getByText('Thread 2')).toBeInTheDocument();
    });

    it('should handle undefined changeGroups parameter', () => {
      render(
        <ThreadList
          threads={mockThreads}
          changeGroups={undefined}
          emptyMessage="No threads"
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      expect(screen.getByText('Thread 1')).toBeInTheDocument();
      expect(screen.getByText('Thread 2')).toBeInTheDocument();
    });

    it('should handle isBlacklisted false explicitly', () => {
      render(
        <ThreadList
          threads={mockThreads}
          isBlacklisted={false}
          emptyMessage="No threads"
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      expect(screen.getAllByText('打开')).toHaveLength(2);
      expect(screen.getAllByText('屏蔽')).toHaveLength(2);
      expect(screen.queryByText('恢复')).not.toBeInTheDocument();
    });

    it('should handle changes without matching threads', () => {
      const nonMatchingChange: TitleChange = {
        threadId: 'non-existent',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: Date.now(),
        seen: false,
      };

      render(
        <ThreadList
          threads={mockThreads}
          changes={[nonMatchingChange]}
          emptyMessage="No threads"
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      // Should still render threads, just without the change data
      expect(screen.getByText('Thread 1')).toBeInTheDocument();
      expect(screen.getByText('Thread 2')).toBeInTheDocument();
    });
  });

  describe('CSS classes and structure', () => {
    it('should render with thread-list class', () => {
      const { container } = render(
        <ThreadList
          threads={mockThreads}
          emptyMessage="No threads"
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      expect(container.querySelector('.thread-list')).toBeInTheDocument();
    });

    it('should render empty message with empty-message class', () => {
      const { container } = render(
        <ThreadList
          threads={[]}
          emptyMessage="No threads"
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      expect(container.querySelector('.empty-message')).toBeInTheDocument();
    });

    it('should render change groups with thread-list class', () => {
      const { container } = render(
        <ThreadList
          threads={mockThreads}
          changeGroups={mockChangeGroups}
          emptyMessage="No changes"
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
          onResume={mockOnResume}
        />
      );

      expect(container.querySelector('.thread-list')).toBeInTheDocument();
    });
  });
});
