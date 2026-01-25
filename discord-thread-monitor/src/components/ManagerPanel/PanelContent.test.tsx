import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import type { MonitoredThread, ThreadChangeGroup, StorageInfo } from '../../types';

describe('PanelContent', () => {
  let mockHandlers: {
    onFilterModeChange: (mode: 'all' | 'within' | 'older') => void;
    onPeriodChange: (period: '1h' | '6h' | '24h' | '7d') => void;
    onMarkAllRead: () => void;
    onClearChanges: () => void;
    onOpen: (url: string, threadId: string) => void;
    onBlock: (threadId: string) => void;
    onResume: (threadId: string) => void;
    onSimulateTitleChange: () => void;
    onRetentionChange: (days: number) => void;
  };

  let getTexts: ReturnType<(typeof import('../../i18n'))['getTexts']>;
  let PanelContent: ReturnType<(typeof import('./PanelContent'))['PanelContent']>;
  let t: ReturnType<(typeof import('../../i18n'))['getTexts']>;
  let mockThreads: MonitoredThread[];
  let mockChangeGroups: ThreadChangeGroup[];
  let mockStorageInfo: StorageInfo;

  beforeEach(async () => {
    mockHandlers = {
      onFilterModeChange: vi.fn(),
      onPeriodChange: vi.fn(),
      onMarkAllRead: vi.fn(),
      onClearChanges: vi.fn(),
      onOpen: vi.fn(),
      onBlock: vi.fn(),
      onResume: vi.fn(),
      onSimulateTitleChange: vi.fn(),
      onRetentionChange: vi.fn(),
    };

    // Clear any cached modules first
    vi.resetModules();

    // Import modules dynamically after setting up mocks
    const i18nModule = await import('../../i18n');
    getTexts = i18nModule.getTexts;
    t = getTexts('en');

    const panelModule = await import('./PanelContent');
    PanelContent = panelModule.PanelContent;

    mockThreads = [
      {
        id: 'thread-1',
        currentTitle: 'Test Thread 1',
        url: 'https://discord.com/thread/1',
        parentChannel: 'General',
        firstSeenAt: Date.now(),
      },
    ];

    mockChangeGroups = [
      {
        threadId: 'thread-1',
        threadTitle: 'Test Thread',
        channelName: 'General',
        latestChangeAt: Date.now(),
        changes: [
          {
            threadId: 'thread-1',
            threadTitle: 'Test Thread',
            oldTitle: 'Old Title',
            newTitle: 'New Title',
            timestamp: Date.now(),
            channelName: 'General',
            serverId: 'server-1',
            seen: false,
          },
        ],
      },
    ];

    mockStorageInfo = {
      size: 1024,
      compressed: false,
      threadCount: 1,
      changeCount: 5,
      lastUpdated: Date.now(),
    };
  });

  describe('Tab rendering', () => {
    it('should render ChangesTabContent when activeTab is "changes"', () => {
      render(
        <PanelContent
          activeTab="changes"
          threads={[]}
          blacklistedThreads={[]}
          filteredChangeGroups={mockChangeGroups}
          storageInfo={mockStorageInfo}
          showStorageWarning={false}
          retentionDays={30}
          unseenCount={5}
          changesLength={5}
          filterMode="all"
          selectedPeriod="day"
          {...mockHandlers}
          t={t}
        />
      );

      // Should show the filter buttons
      expect(screen.getByText(t.filters.all)).toBeInTheDocument();
      expect(screen.getByText(t.filters.within)).toBeInTheDocument();
      expect(screen.getByText(t.filters.older)).toBeInTheDocument();
    });

    it('should render ThreadList when activeTab is "monitoring"', () => {
      render(
        <PanelContent
          activeTab="monitoring"
          threads={[]}
          blacklistedThreads={[]}
          filteredChangeGroups={[]}
          storageInfo={mockStorageInfo}
          showStorageWarning={false}
          retentionDays={30}
          unseenCount={0}
          changesLength={0}
          filterMode="all"
          selectedPeriod="day"
          {...mockHandlers}
          t={t}
        />
      );

      expect(screen.getByText(t.labels.noThreads)).toBeInTheDocument();
    });

    it('should render ThreadList with blacklisted threads when activeTab is "blacklist"', () => {
      render(
        <PanelContent
          activeTab="blacklist"
          threads={[]}
          blacklistedThreads={[]}
          filteredChangeGroups={[]}
          storageInfo={mockStorageInfo}
          showStorageWarning={false}
          retentionDays={30}
          unseenCount={0}
          changesLength={0}
          filterMode="all"
          selectedPeriod="day"
          {...mockHandlers}
          t={t}
        />
      );

      expect(screen.getByText(t.labels.noBlacklist)).toBeInTheDocument();
    });

    it('should render DebugTabContent when activeTab is "debug"', () => {
      render(
        <PanelContent
          activeTab="debug"
          threads={[]}
          blacklistedThreads={[]}
          filteredChangeGroups={[]}
          storageInfo={mockStorageInfo}
          showStorageWarning={false}
          retentionDays={30}
          unseenCount={5}
          changesLength={5}
          filterMode="all"
          selectedPeriod="day"
          {...mockHandlers}
          t={t}
        />
      );

      // DebugTabContent should show storage info
      expect(screen.getByText('Retention:')).toBeInTheDocument();
    });
  });

  describe('Props passing', () => {
    it('should pass correct props to ChangesTabContent', () => {
      render(
        <PanelContent
          activeTab="changes"
          threads={[]}
          blacklistedThreads={[]}
          filteredChangeGroups={mockChangeGroups}
          storageInfo={mockStorageInfo}
          showStorageWarning={false}
          retentionDays={30}
          unseenCount={5}
          changesLength={5}
          filterMode="within"
          selectedPeriod="day"
          {...mockHandlers}
          t={t}
        />
      );

      // Should show the active filter mode
      expect(screen.getByText(t.filters.within)).toHaveClass('active');
      expect(screen.getByText(t.filters.periods.day)).toBeInTheDocument();
    });

    it('should pass correct props to ThreadList for monitoring', () => {
      const threads = [
        {
          id: 'thread-1',
          currentTitle: 'Monitored Thread',
          url: 'https://discord.com/thread/monitored',
          parentChannel: 'General',
          firstSeenAt: Date.now(),
        },
      ];

      render(
        <PanelContent
          activeTab="monitoring"
          threads={threads}
          blacklistedThreads={[]}
          filteredChangeGroups={[]}
          storageInfo={mockStorageInfo}
          showStorageWarning={false}
          retentionDays={30}
          unseenCount={0}
          changesLength={0}
          filterMode="all"
          selectedPeriod="day"
          {...mockHandlers}
          t={t}
        />
      );

      // Should show the thread title (ThreadList renders ThreadItem components)
      expect(screen.getByText('Monitored Thread')).toBeInTheDocument();
    });

    it('should pass correct props to ThreadList for blacklist', () => {
      const blacklistedThreads = [
        {
          id: 'thread-blacklist-1',
          currentTitle: 'Blacklisted Thread',
          url: 'https://discord.com/thread/blacklist-1',
          parentChannel: 'General',
          firstSeenAt: Date.now(),
        },
      ];

      render(
        <PanelContent
          activeTab="blacklist"
          threads={[]}
          blacklistedThreads={blacklistedThreads}
          filteredChangeGroups={[]}
          storageInfo={mockStorageInfo}
          showStorageWarning={false}
          retentionDays={30}
          unseenCount={0}
          changesLength={0}
          filterMode="all"
          selectedPeriod="day"
          {...mockHandlers}
          t={t}
        />
      );

      // Should show the blacklisted thread
      expect(screen.getByText('Blacklisted Thread')).toBeInTheDocument();
    });

    it('should pass correct props to DebugTabContent', () => {
      render(
        <PanelContent
          activeTab="debug"
          threads={[]}
          blacklistedThreads={[]}
          filteredChangeGroups={[]}
          storageInfo={mockStorageInfo}
          showStorageWarning={true}
          retentionDays={30}
          unseenCount={5}
          changesLength={5}
          filterMode="all"
          selectedPeriod="day"
          {...mockHandlers}
          t={t}
        />
      );

      // DebugTabContent should show the retention input with hint
      expect(screen.getByPlaceholderText('0')).toBeInTheDocument();
      expect(screen.getByText(t.settings.retentionHint)).toBeInTheDocument();
    });
  });

  describe('Container styling', () => {
    it('should have the correct container class', () => {
      const { container } = render(
        <PanelContent
          activeTab="changes"
          threads={[]}
          blacklistedThreads={[]}
          filteredChangeGroups={mockChangeGroups}
          storageInfo={mockStorageInfo}
          showStorageWarning={false}
          retentionDays={30}
          unseenCount={5}
          changesLength={5}
          filterMode="all"
          selectedPeriod="day"
          {...mockHandlers}
          t={t}
        />
      );

      const panelContent = container.querySelector('.panel-content');
      expect(panelContent).toBeInTheDocument();
    });

    it('should have scrollbar class for overflow', () => {
      const { container } = render(
        <PanelContent
          activeTab="monitoring"
          threads={mockThreads}
          blacklistedThreads={[]}
          filteredChangeGroups={[]}
          storageInfo={mockStorageInfo}
          showStorageWarning={false}
          retentionDays={30}
          unseenCount={0}
          changesLength={0}
          filterMode="all"
          selectedPeriod="day"
          {...mockHandlers}
          t={t}
        />
      );

      const panelContent = container.querySelector('.panel-content.tm-scrollbar');
      expect(panelContent).toBeInTheDocument();
    });
  });
});
