import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManagerPanel } from './ManagerPanel';
import { useDraggable } from '../hooks/useDraggable';
import type { MonitoredThread, TitleChange, ThreadChangeGroup, StorageInfo } from '../types';

vi.mock('../hooks/useDraggable');
vi.mock('./Icons', () => ({
  ScanIcon: () => <div data-testid="scan-icon">ScanIcon</div>,
  CloseIcon: () => <div data-testid="close-icon">CloseIcon</div>,
  HelpIcon: () => <div data-testid="help-icon">HelpIcon</div>,
}));

vi.mock('./HelpTooltip', () => ({
  HelpTooltip: ({ show, onClose }: { show: boolean; onClose: () => void }) =>
    show ? (
      <div data-testid="help-tooltip" onClick={onClose}>
        Help Tooltip
      </div>
    ) : null,
}));

vi.mock('./ThreadList', () => ({
  ThreadList: ({ threads, changeGroups, emptyMessage }: any) => (
    <div data-testid="thread-list">
      {changeGroups ? `${changeGroups.length} groups` : `${threads.length} threads`}
      {emptyMessage && <div>{emptyMessage}</div>}
    </div>
  ),
}));

vi.mock('../i18n', () => ({
  getTexts: vi.fn(() => ({
    title: 'Thread Monitor',
    scanNow: 'Scan Now',
    tabs: {
      changes: 'Changes',
      monitoring: 'Monitoring',
      blacklist: 'Blacklist',
      debug: 'Debug',
    },
    actions: {
      markAllRead: 'Mark All Read',
      clearChanges: 'Clear Changes',
    },
    filters: {
      allUnread: 'All Unread',
      all: 'All',
      within: 'Within',
      older: 'Older',
      periods: {
        week: '1 Week',
        month: '1 Month',
        month3: '3 Months',
      },
    },
    labels: {
      noChanges: 'No Changes',
      noThreads: 'No Threads',
      noBlacklist: 'No Blacklist',
    },
    settings: {
      retentionPeriod: 'Retention',
      permanent: 'Permanent',
      days: 'days',
      storageUsage: 'Storage Usage',
      rawSize: 'Raw Size',
      compressedSize: 'Compressed Size',
      compression: 'Compression',
      enabled: 'Enabled',
      disabled: 'Disabled',
      storageTooLarge: 'Storage too large',
    },
    debug: {
      simulateChange: 'Simulate Change',
      clearAll: 'Clear All',
      stats: {
        threads: 'Threads',
        changes: 'Changes',
        unseen: 'Unseen',
      },
    },
  })),
  getCurrentLanguage: vi.fn(() => 'zh'),
  setLanguage: vi.fn(),
}));

describe('ManagerPanel', () => {
  const mockUseDraggable = useDraggable as Mock<typeof useDraggable>;

  const defaultProps = {
    isOpen: true,
    threads: [] as MonitoredThread[],
    changes: [] as TitleChange[],
    changeGroups: [] as ThreadChangeGroup[],
    blacklistedThreads: [] as MonitoredThread[],
    unseenCount: 0,
    retentionDays: 30,
    storageInfo: {
      rawSize: 1024,
      compressedSize: 512,
      isCompressed: false,
      changeCount: 0,
      threadCount: 0,
    } as StorageInfo,
    onClose: vi.fn(),
    onScanNow: vi.fn(),
    onOpen: vi.fn(),
    onBlock: vi.fn(),
    onResume: vi.fn(),
    onClearChanges: vi.fn(),
    onMarkAllRead: vi.fn(),
    onSimulateTitleChange: vi.fn(),
    onRetentionChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseDraggable.mockReturnValue({
      position: { x: 100, y: 100 },
      isDragging: false,
      handleMouseDown: vi.fn(),
    });

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(<ManagerPanel {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(<ManagerPanel {...defaultProps} />);
      expect(screen.getByText('Thread Monitor')).toBeInTheDocument();
    });

    it('should render all tab buttons', () => {
      render(<ManagerPanel {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Monitoring/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Blacklist/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Debug/i })).toBeInTheDocument();
    });

    it('should render header action buttons', () => {
      render(<ManagerPanel {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Scan Now/i })).toBeInTheDocument();
      expect(screen.getByTitle('Switch Language')).toBeInTheDocument();
      expect(screen.getByTestId('help-icon')).toBeInTheDocument();
      expect(screen.getByTestId('close-icon')).toBeInTheDocument();
    });

    it('should display change count badge on changes tab', () => {
      const now = Date.now();
      const changes: TitleChange[] = [
        { threadId: '1', oldTitle: 'Old', newTitle: 'New', changedAt: now, seen: false },
        { threadId: '2', oldTitle: 'Old2', newTitle: 'New2', changedAt: now, seen: false },
      ];
      const changeGroups: ThreadChangeGroup[] = [
        {
          threadId: '1',
          thread: undefined,
          changes: [changes[0]],
          latestChangeAt: now,
          hasUnseen: true,
        },
        {
          threadId: '2',
          thread: undefined,
          changes: [changes[1]],
          latestChangeAt: now,
          hasUnseen: true,
        },
      ];

      render(<ManagerPanel {...defaultProps} changes={changes} changeGroups={changeGroups} />);

      const badge = document.querySelector('.tab-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('2');
    });

    it('should not display badge when there are no changes', () => {
      render(<ManagerPanel {...defaultProps} changes={[]} />);

      const badge = document.querySelector('.tab-badge');
      expect(badge).not.toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should default to changes tab', () => {
      render(<ManagerPanel {...defaultProps} />);

      const changesTab = screen.getByRole('button', { name: /Changes/i });
      expect(changesTab).toHaveClass('active');
    });

    it('should switch to monitoring tab when clicked', async () => {
      const user = userEvent.setup();
      render(<ManagerPanel {...defaultProps} />);

      const monitoringTab = screen.getByRole('button', { name: /Monitoring/i });
      await user.click(monitoringTab);

      expect(monitoringTab).toHaveClass('active');
    });

    it('should switch to blacklist tab when clicked', async () => {
      const user = userEvent.setup();
      render(<ManagerPanel {...defaultProps} />);

      const blacklistTab = screen.getByRole('button', { name: /Blacklist/i });
      await user.click(blacklistTab);

      expect(blacklistTab).toHaveClass('active');
    });

    it('should switch to debug tab when clicked', async () => {
      const user = userEvent.setup();
      render(<ManagerPanel {...defaultProps} />);

      const debugTab = screen.getByRole('button', { name: /Debug/i });
      await user.click(debugTab);

      expect(debugTab).toHaveClass('active');
    });

    it('should remove active class from previous tab', async () => {
      const user = userEvent.setup();
      render(<ManagerPanel {...defaultProps} />);

      const changesTab = screen.getByRole('button', { name: /Changes/i });
      const monitoringTab = screen.getByRole('button', { name: /Monitoring/i });

      expect(changesTab).toHaveClass('active');

      await user.click(monitoringTab);

      expect(changesTab).not.toHaveClass('active');
      expect(monitoringTab).toHaveClass('active');
    });
  });

  describe('Header Actions', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<ManagerPanel {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByTitle('Close');
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onScanNow when scan button is clicked', async () => {
      const user = userEvent.setup();
      const onScanNow = vi.fn();

      render(<ManagerPanel {...defaultProps} onScanNow={onScanNow} />);

      const scanButton = screen.getByRole('button', { name: /Scan Now/i });
      await user.click(scanButton);

      expect(onScanNow).toHaveBeenCalledTimes(1);
    });

    it('should toggle language when language button is clicked', async () => {
      const user = userEvent.setup();
      const { setLanguage } = await import('../i18n');

      render(<ManagerPanel {...defaultProps} />);

      const langButton = screen.getByTitle('Switch Language');
      await user.click(langButton);

      expect(setLanguage).toHaveBeenCalledWith('en');
    });

    it('should show help tooltip when help button is clicked', async () => {
      const user = userEvent.setup();

      render(<ManagerPanel {...defaultProps} />);

      const helpButton = screen.getByTestId('help-icon').closest('button');
      if (helpButton) {
        await user.click(helpButton);
      }

      expect(screen.getByTestId('help-tooltip')).toBeInTheDocument();
    });
  });

  describe('Changes Tab', () => {
    it('should display mark all read button when there are unseen changes', () => {
      const changeGroups: ThreadChangeGroup[] = [
        {
          threadId: '1',
          thread: {
            id: '1',
            currentTitle: 'Test',
            url: 'https://discord.com/1',
            parentChannel: 'General',
            firstSeenAt: Date.now(),
          },
          changes: [
            { threadId: '1', oldTitle: 'Old', newTitle: 'New', changedAt: Date.now(), seen: false },
          ],
          latestChangeAt: Date.now(),
          hasUnseen: true,
        },
      ];

      render(<ManagerPanel {...defaultProps} unseenCount={1} changeGroups={changeGroups} />);

      expect(screen.getByRole('button', { name: /Mark All Read/i })).toBeInTheDocument();
    });

    it('should not display mark all read button when unseenCount is 0', () => {
      render(<ManagerPanel {...defaultProps} unseenCount={0} />);

      expect(screen.queryByRole('button', { name: /Mark All Read/i })).not.toBeInTheDocument();
    });

    it('should call onMarkAllRead when mark all read button is clicked', async () => {
      const user = userEvent.setup();
      const onMarkAllRead = vi.fn();

      const changeGroups: ThreadChangeGroup[] = [
        {
          threadId: '1',
          thread: {
            id: '1',
            currentTitle: 'Test',
            url: 'https://discord.com/1',
            parentChannel: 'General',
            firstSeenAt: Date.now(),
          },
          changes: [
            { threadId: '1', oldTitle: 'Old', newTitle: 'New', changedAt: Date.now(), seen: false },
          ],
          latestChangeAt: Date.now(),
          hasUnseen: true,
        },
      ];

      render(
        <ManagerPanel
          {...defaultProps}
          unseenCount={1}
          changeGroups={changeGroups}
          onMarkAllRead={onMarkAllRead}
        />
      );

      const button = screen.getByRole('button', { name: /Mark All Read/i });
      await user.click(button);

      expect(onMarkAllRead).toHaveBeenCalledTimes(1);
    });

    it('should display filter mode buttons', () => {
      render(<ManagerPanel {...defaultProps} />);

      expect(screen.getByRole('button', { name: /^All$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Within/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Older/i })).toBeInTheDocument();
    });

    it('should show period buttons when filter mode is not "all"', async () => {
      const user = userEvent.setup();

      render(<ManagerPanel {...defaultProps} />);

      const withinButton = screen.getByRole('button', { name: /Within/i });
      await user.click(withinButton);

      expect(screen.getByRole('button', { name: /1 Week/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /1 Month/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /3 Months/i })).toBeInTheDocument();
    });

    it('should not show period buttons when filter mode is "all"', async () => {
      const user = userEvent.setup();
      render(<ManagerPanel {...defaultProps} />);

      const allButton = screen.getByRole('button', { name: /^All$/ });
      await user.click(allButton);

      expect(screen.queryByRole('button', { name: /1 Week/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /1 Month/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /3 Months/i })).not.toBeInTheDocument();
    });
  });

  describe('Debug Tab', () => {
    it('should display retention period input', async () => {
      const user = userEvent.setup();
      render(<ManagerPanel {...defaultProps} />);

      const debugTab = screen.getByRole('button', { name: /Debug/i });
      await user.click(debugTab);

      expect(screen.getByPlaceholderText('0')).toBeInTheDocument();
    });

    it('should display storage usage information', async () => {
      const user = userEvent.setup();
      render(<ManagerPanel {...defaultProps} />);

      const debugTab = screen.getByRole('button', { name: /Debug/i });
      await user.click(debugTab);

      expect(screen.getByText('Storage Usage:')).toBeInTheDocument();
      expect(screen.getByText('Raw Size:')).toBeInTheDocument();
    });

    it('should display debug stats', async () => {
      const user = userEvent.setup();
      render(<ManagerPanel {...defaultProps} />);

      const debugTab = screen.getByRole('button', { name: /Debug/i });
      await user.click(debugTab);

      expect(screen.getByText('Threads:')).toBeInTheDocument();
      expect(screen.getByText('Changes:')).toBeInTheDocument();
      expect(screen.getByText('Unseen:')).toBeInTheDocument();
    });

    it('should call onSimulateTitleChange when simulate button is clicked', async () => {
      const user = userEvent.setup();
      const onSimulateTitleChange = vi.fn();

      render(<ManagerPanel {...defaultProps} onSimulateTitleChange={onSimulateTitleChange} />);

      const debugTab = screen.getByRole('button', { name: /Debug/i });
      await user.click(debugTab);

      const simulateButton = screen.getByRole('button', { name: /Simulate Change/i });
      await user.click(simulateButton);

      expect(onSimulateTitleChange).toHaveBeenCalledTimes(1);
    });

    it('should display retention period value in input', async () => {
      const user = userEvent.setup();

      render(<ManagerPanel {...defaultProps} retentionDays={30} />);

      const debugTab = screen.getByRole('button', { name: /Debug/i });
      await user.click(debugTab);

      const input = screen.getByPlaceholderText('0') as HTMLInputElement;
      await waitFor(() => {
        expect(input.value).toBe('30');
      });
    });

    it('should display 0 when retention is permanent', async () => {
      const user = userEvent.setup();

      render(<ManagerPanel {...defaultProps} retentionDays={0} />);

      const debugTab = screen.getByRole('button', { name: /Debug/i });
      await user.click(debugTab);

      const input = screen.getByPlaceholderText('0') as HTMLInputElement;
      await waitFor(() => {
        expect(input.value).toBe('0');
      });
    });

    it('should show compressed size when storage is compressed', async () => {
      const user = userEvent.setup();
      const storageInfo: StorageInfo = {
        rawSize: 100000,
        compressedSize: 50000,
        isCompressed: true,
        changeCount: 10,
        threadCount: 5,
      };

      render(<ManagerPanel {...defaultProps} storageInfo={storageInfo} />);

      const debugTab = screen.getByRole('button', { name: /Debug/i });
      await user.click(debugTab);

      expect(screen.getByText('Compressed Size:')).toBeInTheDocument();
    });
  });

  describe('Storage Warning', () => {
    it('should display warning banner when storage exceeds threshold', async () => {
      const user = userEvent.setup();
      const storageInfo: StorageInfo = {
        rawSize: 250000,
        compressedSize: 125000,
        isCompressed: true,
        changeCount: 100,
        threadCount: 50,
      };

      render(<ManagerPanel {...defaultProps} storageInfo={storageInfo} />);

      const debugTab = screen.getByRole('button', { name: /Debug/i });
      await user.click(debugTab);

      expect(screen.getByText('Storage too large')).toBeInTheDocument();
    });

    it('should not display warning banner when storage is below threshold', () => {
      const storageInfo: StorageInfo = {
        rawSize: 100000,
        compressedSize: 50000,
        isCompressed: true,
        changeCount: 10,
        threadCount: 5,
      };

      render(<ManagerPanel {...defaultProps} storageInfo={storageInfo} />);

      expect(screen.queryByText('Storage too large')).not.toBeInTheDocument();
    });
  });

  describe('Draggable Behavior', () => {
    it('should use draggable hook with correct parameters', () => {
      render(<ManagerPanel {...defaultProps} />);

      expect(mockUseDraggable).toHaveBeenCalledWith(
        expect.objectContaining({
          storageKey: 'thread-monitor-panel-position',
          defaultPosition: expect.any(Object),
          bounds: { width: 440, height: 200 },
          excludeSelector: '.panel-actions, .panel-tabs, .panel-content',
        })
      );
    });

    it('should apply dragging cursor when dragging', () => {
      mockUseDraggable.mockReturnValue({
        position: { x: 100, y: 100 },
        isDragging: true,
        handleMouseDown: vi.fn(),
      });

      render(<ManagerPanel {...defaultProps} />);

      const panel = document.querySelector('.manager-panel');
      expect(panel).toHaveStyle({ cursor: 'grabbing' });
    });

    it('should apply default cursor when not dragging', () => {
      mockUseDraggable.mockReturnValue({
        position: { x: 100, y: 100 },
        isDragging: false,
        handleMouseDown: vi.fn(),
      });

      render(<ManagerPanel {...defaultProps} />);

      const panel = document.querySelector('.manager-panel');
      expect(panel).toHaveStyle({ cursor: 'default' });
    });
  });

  describe('Help Tooltip', () => {
    it('should show help tooltip on first open', async () => {
      render(<ManagerPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByTestId('help-tooltip')).toBeInTheDocument();
      });
    });

    it('should not show help tooltip on subsequent opens', async () => {
      localStorage.setItem('thread-monitor-help-seen', 'true');

      render(<ManagerPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByTestId('help-tooltip')).not.toBeInTheDocument();
      });
    });

    it('should close help tooltip when onClose is called', async () => {
      const user = userEvent.setup();

      render(<ManagerPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('help-tooltip')).toBeInTheDocument();
      });

      const helpTooltip = screen.getByTestId('help-tooltip');
      await user.click(helpTooltip);

      expect(screen.queryByTestId('help-tooltip')).not.toBeInTheDocument();
    });
  });
});
