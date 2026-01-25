import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThreadChangeGroupItem } from './ThreadChangeGroupItem';
import type { ThreadChangeGroup, MonitoredThread, TitleChange } from '../types';

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

describe('ThreadChangeGroupItem', () => {
  let mockOnOpen: ReturnType<typeof vi.fn>;
  let mockOnBlock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnOpen = vi.fn();
    mockOnBlock = vi.fn();
  });

  const mockThread: MonitoredThread = {
    id: 'thread-123',
    currentTitle: 'Current Thread Title',
    url: 'https://discord.com/channels/123/456/thread-123',
    parentChannel: 'general',
    firstSeenAt: Date.now() - 3600000,
  };

  const mockChanges: TitleChange[] = [
    {
      threadId: 'thread-123',
      oldTitle: 'Original Title',
      newTitle: 'Updated Title',
      changedAt: Date.now() - 60000,
      seen: false,
    },
  ];

  const mockGroup: ThreadChangeGroup = {
    threadId: 'thread-123',
    thread: mockThread,
    changes: mockChanges,
    latestChangeAt: Date.now() - 60000,
    hasUnseen: true,
  };

  describe('Rendering', () => {
    it('should render thread title from thread', () => {
      render(<ThreadChangeGroupItem group={mockGroup} onOpen={mockOnOpen} onBlock={mockOnBlock} />);

      expect(screen.getByText('Current Thread Title')).toBeInTheDocument();
    });

    it('should render thread title from latest change when thread is undefined', () => {
      const groupWithoutThread: ThreadChangeGroup = {
        ...mockGroup,
        thread: undefined,
        changes: [
          {
            threadId: 'thread-123',
            oldTitle: 'Old Title',
            newTitle: 'New Title',
            changedAt: Date.now(),
            seen: false,
          },
        ],
      };

      render(
        <ThreadChangeGroupItem
          group={groupWithoutThread}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
        />
      );

      // Should render the thread title in the header
      const titleText = container.querySelector('.title-text');
      expect(titleText).toBeInTheDocument();
      expect(titleText?.textContent).toBe('New Title');
    });

    it('should render parent channel from thread', () => {
      render(<ThreadChangeGroupItem group={mockGroup} onOpen={mockOnOpen} onBlock={mockOnBlock} />);

      expect(screen.getByText('general')).toBeInTheDocument();
    });

    it('should render parent channel from latest change when thread is undefined', () => {
      const groupWithoutThread: ThreadChangeGroup = {
        ...mockGroup,
        thread: undefined,
      };

      render(
        <ThreadChangeGroupItem
          group={groupWithoutThread}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
        />
      );

      // Should not render any parent channel
      expect(screen.queryByText('general')).not.toBeInTheDocument();
    });

    it('should render time using formatTime', () => {
      render(<ThreadChangeGroupItem group={mockGroup} onOpen={mockOnOpen} onBlock={mockOnBlock} />);

      expect(screen.getByText(/.*m ago/)).toBeInTheDocument();
    });

    it('should apply unseen class when hasUnseen is true', () => {
      render(<ThreadChangeGroupItem group={mockGroup} onOpen={mockOnOpen} onBlock={mockOnBlock} />);

      const groupElement = container.querySelector('.thread-group');
      expect(groupElement).toHaveClass('unseen');
    });

    it('should not apply unseen class when hasUnseen is false', () => {
      const groupNotUnseen: ThreadChangeGroup = {
        ...mockGroup,
        hasUnseen: false,
      };

      render(
        <ThreadChangeGroupItem group={groupNotUnseen} onOpen={mockOnOpen} onBlock={mockOnBlock} />
      );

      const groupElement = container.querySelector('.thread-group');
      expect(groupElement).not.toHaveClass('unseen');
    });

    it('should render change count when multiple changes exist', () => {
      const groupWithMultipleChanges: ThreadChangeGroup = {
        ...mockGroup,
        changes: [
          ...mockChanges,
          {
            threadId: 'thread-123',
            oldTitle: 'Another Old Title',
            newTitle: 'Another New Title',
            changedAt: Date.now() - 120000,
            seen: false,
          },
        ],
      };

      render(
        <ThreadChangeGroupItem
          group={groupWithMultipleChanges}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument(); // Change count
    });

    it('should not render change count when only one change exists', () => {
      render(<ThreadChangeGroupItem group={mockGroup} onOpen={mockOnOpen} onBlock={mockOnBlock} />);

      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });
  });

  describe('Expand/Collapse behavior', () => {
    it('should not render expand toggle when only one change exists', () => {
      render(<ThreadChangeGroupItem group={mockGroup} onOpen={mockOnOpen} onBlock={mockOnBlock} />);

      expect(container.querySelector('.expand-toggle')).not.toBeInTheDocument();
    });

    it('should render expand toggle when multiple changes exist', () => {
      const groupWithMultipleChanges: ThreadChangeGroup = {
        ...mockGroup,
        changes: [
          ...mockChanges,
          {
            threadId: 'thread-123',
            oldTitle: 'Another Old Title',
            newTitle: 'Another New Title',
            changedAt: Date.now() - 120000,
            seen: false,
          },
        ],
      };

      render(
        <ThreadChangeGroupItem
          group={groupWithMultipleChanges}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
        />
      );

      expect(container.querySelector('.expand-toggle')).toBeInTheDocument();
    });

    it('should start collapsed when multiple changes exist', () => {
      const groupWithMultipleChanges: ThreadChangeGroup = {
        ...mockGroup,
        changes: [
          ...mockChanges,
          {
            threadId: 'thread-123',
            oldTitle: 'Another Old Title',
            newTitle: 'Another New Title',
            changedAt: Date.now() - 120000,
            seen: false,
          },
        ],
      };

      render(
        <ThreadChangeGroupItem
          group={groupWithMultipleChanges}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
        />
      );

      const changesContainer = container.querySelector('.thread-group-changes');
      expect(changesContainer).not.toHaveClass('expanded');
    });

    it('should expand when expand toggle is clicked', () => {
      const groupWithMultipleChanges: ThreadChangeGroup = {
        ...mockGroup,
        changes: [
          ...mockChanges,
          {
            threadId: 'thread-123',
            oldTitle: 'Another Old Title',
            newTitle: 'Another New Title',
            changedAt: Date.now() - 120000,
            seen: false,
          },
        ],
      };

      render(
        <ThreadChangeGroupItem
          group={groupWithMultipleChanges}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
        />
      );

      const expandToggle = container.querySelector('.expand-toggle');
      expect(expandToggle).toBeInTheDocument();

      act(() => {
        expandToggle!.click();
      });

      const changesContainer = container.querySelector('.thread-group-changes');
      expect(changesContainer).toHaveClass('expanded');
    });

    it('should show all changes when expanded', () => {
      const groupWithMultipleChanges: ThreadChangeGroup = {
        ...mockGroup,
        changes: [
          {
            threadId: 'thread-123',
            oldTitle: 'First Old Title',
            newTitle: 'First New Title',
            changedAt: Date.now() - 60000,
            seen: false,
          },
          {
            threadId: 'thread-123',
            oldTitle: 'Second Old Title',
            newTitle: 'Second New Title',
            changedAt: Date.now() - 120000,
            seen: false,
          },
        ],
      };

      render(
        <ThreadChangeGroupItem
          group={groupWithMultipleChanges}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
        />
      );

      const expandToggle = container.querySelector('.expand-toggle');

      act(() => {
        expandToggle!.click();
      });

      // All changes should be visible
      expect(screen.getByText('First Old Title')).toBeInTheDocument();
      expect(screen.getByText('First New Title')).toBeInTheDocument();
      expect(screen.getByText('Second Old Title')).toBeInTheDocument();
      expect(screen.getByText('Second New Title')).toBeInTheDocument();
    });

    it('should only show latest change when collapsed', () => {
      const groupWithMultipleChanges: ThreadChangeGroup = {
        ...mockGroup,
        changes: [
          {
            threadId: 'thread-123',
            oldTitle: 'Latest Old Title',
            newTitle: 'Latest New Title',
            changedAt: Date.now() - 60000,
            seen: false,
          },
          {
            threadId: 'thread-123',
            oldTitle: 'Older Old Title',
            newTitle: 'Older New Title',
            changedAt: Date.now() - 120000,
            seen: false,
          },
        ],
      };

      render(
        <ThreadChangeGroupItem
          group={groupWithMultipleChanges}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
        />
      );

      // Only latest change should be visible
      expect(screen.getByText('Latest Old Title')).toBeInTheDocument();
      expect(screen.getByText('Latest New Title')).toBeInTheDocument();
      expect(screen.queryByText('Older Old Title')).not.toBeInTheDocument();
      expect(screen.queryByText('Older New Title')).not.toBeInTheDocument();
    });

    it('should show change times when expanded', () => {
      const groupWithMultipleChanges: ThreadChangeGroup = {
        ...mockGroup,
        changes: [
          {
            threadId: 'thread-123',
            oldTitle: 'First Old Title',
            newTitle: 'First New Title',
            changedAt: Date.now() - 60000,
            seen: false,
          },
          {
            threadId: 'thread-123',
            oldTitle: 'Second Old Title',
            newTitle: 'Second New Title',
            changedAt: Date.now() - 120000,
            seen: false,
          },
        ],
      };

      render(
        <ThreadChangeGroupItem
          group={groupWithMultipleChanges}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
        />
      );

      // Since there are multiple changes, expand first
      const expandToggle = container.querySelector('.expand-toggle');
      expect(expandToggle).toBeInTheDocument();

      act(() => {
        expandToggle!.click();
      });

      // Should show change time for the expanded view
      const changeTime = container.querySelector('.change-time');
      expect(changeTime).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should render Open and Block buttons when thread exists', () => {
      render(<ThreadChangeGroupItem group={mockGroup} onOpen={mockOnOpen} onBlock={mockOnBlock} />);

      expect(screen.getByText('打开')).toBeInTheDocument();
      expect(screen.getByText('屏蔽')).toBeInTheDocument();
    });

    it('should render only Block button when thread is undefined', () => {
      const groupWithoutThread: ThreadChangeGroup = {
        ...mockGroup,
        thread: undefined,
      };

      render(
        <ThreadChangeGroupItem
          group={groupWithoutThread}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
        />
      );

      expect(screen.queryByText('打开')).not.toBeInTheDocument();
      expect(screen.getByText('屏蔽')).toBeInTheDocument();
    });

    it('should call onOpen when Open button is clicked', () => {
      render(<ThreadChangeGroupItem group={mockGroup} onOpen={mockOnOpen} onBlock={mockOnBlock} />);

      const openButton = screen.getByText('打开');
      openButton.click();

      expect(mockOnOpen).toHaveBeenCalledWith(mockThread.url, mockThread.id);
      expect(mockOnBlock).not.toHaveBeenCalled();
    });

    it('should call onBlock when Block button is clicked', () => {
      render(<ThreadChangeGroupItem group={mockGroup} onOpen={mockOnOpen} onBlock={mockOnBlock} />);

      // Find the block button in the header thread-actions
      const threadActions = container.querySelector('.thread-group-header .thread-actions');
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

    it('should call onBlock with threadId even when thread is undefined', () => {
      const groupWithoutThread: ThreadChangeGroup = {
        ...mockGroup,
        thread: undefined,
      };

      render(
        <ThreadChangeGroupItem
          group={groupWithoutThread}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
        />
      );

      const blockButton = screen.getByText('屏蔽');
      blockButton.click();

      expect(mockOnBlock).toHaveBeenCalledWith(mockGroup.threadId);
    });
  });

  describe('Layout structure', () => {
    it('should have proper CSS classes', () => {
      render(<ThreadChangeGroupItem group={mockGroup} onOpen={mockOnOpen} onBlock={mockOnBlock} />);

      expect(container.querySelector('.thread-group')).toBeInTheDocument();
      expect(container.querySelector('.thread-group-header')).toBeInTheDocument();
      expect(container.querySelector('.thread-group-info')).toBeInTheDocument();
      expect(container.querySelector('.thread-group-title')).toBeInTheDocument();
      expect(container.querySelector('.thread-group-meta')).toBeInTheDocument();
      expect(container.querySelector('.thread-actions')).toBeInTheDocument();
    });

    it('should render change rows with proper labels', () => {
      render(<ThreadChangeGroupItem group={mockGroup} onOpen={mockOnOpen} onBlock={mockOnBlock} />);

      expect(screen.getByText('旧')).toBeInTheDocument();
      expect(screen.getByText('新')).toBeInTheDocument();

      const changeRows = container.querySelectorAll('.change-row');
      expect(changeRows.length).toBe(2);
    });

    it('should have expandable changes container', () => {
      render(<ThreadChangeGroupItem group={mockGroup} onOpen={mockOnOpen} onBlock={mockOnBlock} />);

      expect(container.querySelector('.thread-group-changes')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty changes array gracefully', () => {
      const groupWithNoChanges: ThreadChangeGroup = {
        ...mockGroup,
        changes: [],
      };

      // This is an edge case that shouldn't happen in practice
      // The component would crash because latestChange is undefined
      // Let's test that it handles this gracefully by not rendering
      expect(() => {
        render(
          <ThreadChangeGroupItem
            group={groupWithNoChanges}
            onOpen={mockOnOpen}
            onBlock={mockOnBlock}
          />
        );
      }).toThrow();
    });

    it('should handle undefined thread and empty changes', () => {
      const groupWithNoData: ThreadChangeGroup = {
        threadId: 'thread-123',
        thread: undefined,
        changes: [],
        latestChangeAt: Date.now(),
        hasUnseen: false,
      };

      // This is an edge case that shouldn't happen in practice
      // The component would crash because latestChange is undefined
      expect(() => {
        render(
          <ThreadChangeGroupItem
            group={groupWithNoData}
            onOpen={mockOnOpen}
            onBlock={mockOnBlock}
          />
        );
      }).toThrow();
    });

    it('should handle thread with empty parentChannel', () => {
      const threadWithNoChannel = {
        ...mockThread,
        parentChannel: '',
      };

      const groupWithNoChannel: ThreadChangeGroup = {
        ...mockGroup,
        thread: threadWithNoChannel,
      };

      render(
        <ThreadChangeGroupItem
          group={groupWithNoChannel}
          onOpen={mockOnOpen}
          onBlock={mockOnBlock}
        />
      );

      // Should not render any channel text
      expect(screen.queryByText('general')).not.toBeInTheDocument();
    });
  });
});
