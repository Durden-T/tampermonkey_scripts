import { describe, it, expect, vi, beforeEach } from 'vitest';
import { simulateTitleChange } from './simulateTitleChange';
import type { ThreadStore } from '../core/ThreadStore';
import type { Notifier } from '../core/Notifier';

describe('simulateTitleChange', () => {
  let mockStore: {
    getThreads: jest.Mock;
    addThread: jest.Mock;
    recordTitleChange: jest.Mock;
  };
  let mockNotifier: {
    notifyAll: jest.Mock;
  };
  let mockRefreshData: jest.Mock;

  beforeEach(() => {
    mockStore = {
      getThreads: vi.fn(),
      addThread: vi.fn(),
      recordTitleChange: vi.fn(),
    };

    mockNotifier = {
      notifyAll: vi.fn(),
    };

    mockRefreshData = vi.fn();

    // Mock Date.now() for consistent test results
    vi.useFakeTimers();
    vi.setSystemTime(1000000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create new thread and record change when no threads exist', () => {
    // Mock empty threads
    mockStore.getThreads.mockReturnValue({});

    simulateTitleChange(
      mockStore as unknown as ThreadStore,
      mockNotifier as unknown as Notifier,
      mockRefreshData
    );

    // Should add a new thread
    expect(mockStore.addThread).toHaveBeenCalledTimes(1);

    // Should record a title change
    expect(mockStore.recordTitleChange).toHaveBeenCalledTimes(1);

    // Should notify listeners
    expect(mockNotifier.notifyAll).toHaveBeenCalledTimes(1);

    // Should refresh data
    expect(mockRefreshData).toHaveBeenCalledTimes(1);

    // Check that the thread ID includes debug prefix and timestamp
    const addedThread = mockStore.addThread.mock.calls[0][0];
    expect(addedThread.id).toMatch(/^debug-\d+$/);
    expect(addedThread.currentTitle).toBeDefined();
    expect(addedThread.url).toBe('https://discord.com');
    expect(addedThread.parentChannel).toBe('Test Channel');
    expect(addedThread.firstSeenAt).toBe(1000000);

    // Check that the change was recorded
    const recordedChange = mockStore.recordTitleChange.mock.calls[0][0];
    expect(recordedChange.threadId).toBe(addedThread.id);
    expect(recordedChange.oldTitle).toBe(addedThread.currentTitle);
    expect(recordedChange.newTitle).toBeDefined();
    expect(recordedChange.changedAt).toBe(1000000);
    expect(recordedChange.seen).toBe(false);
  });

  it('should modify existing thread when threads exist', () => {
    // Mock existing thread
    const existingThread = {
      id: 'existing-thread',
      currentTitle: 'Original Title',
      url: 'https://discord.com/123',
      parentChannel: 'General',
      firstSeenAt: 500000,
    };

    mockStore.getThreads.mockReturnValue({
      [existingThread.id]: existingThread,
    });

    simulateTitleChange(
      mockStore as unknown as ThreadStore,
      mockNotifier as unknown as Notifier,
      mockRefreshData
    );

    // Should NOT add a new thread (since threads exist)
    expect(mockStore.addThread).not.toHaveBeenCalled();

    // Should record a title change
    expect(mockStore.recordTitleChange).toHaveBeenCalledTimes(1);

    // Should notify listeners
    expect(mockNotifier.notifyAll).toHaveBeenCalledTimes(1);

    // Should refresh data
    expect(mockRefreshData).toHaveBeenCalledTimes(1);

    // Check that the change was recorded for existing thread
    const recordedChange = mockStore.recordTitleChange.mock.calls[0][0];
    expect(recordedChange.threadId).toBe(existingThread.id);
    expect(recordedChange.oldTitle).toBe(existingThread.currentTitle);
    expect(recordedChange.newTitle).toBeDefined();
    expect(recordedChange.newTitle).not.toBe(existingThread.currentTitle); // Should be different
    expect(recordedChange.changedAt).toBe(1000000);
    expect(recordedChange.seen).toBe(false);
  });

  it('should choose from TEST_TITLES for new thread title', () => {
    mockStore.getThreads.mockReturnValue({});

    simulateTitleChange(
      mockStore as unknown as ThreadStore,
      mockNotifier as unknown as Notifier,
      mockRefreshData
    );

    const addedThread = mockStore.addThread.mock.calls[0][0];
    const recordedChange = mockStore.recordTitleChange.mock.calls[0][0];

    // Verify both titles are from the expected list
    const expectedTitles = [
      'Looking for Group - Weekly Raid',
      'Bug Report: Login Issues',
      'Feature Request: Dark Mode',
      'Community Event - Saturday',
      'Help Needed: Database Query',
      'Discussion: Best Practices',
      'Announcement: Server Maintenance',
      'Tutorial: Getting Started Guide',
    ];

    expect(expectedTitles).toContain(addedThread.currentTitle);
    expect(expectedTitles).toContain(recordedChange.newTitle);
  });

  it('should choose from TEST_TITLES for modified thread', () => {
    const existingThread = {
      id: 'existing-thread',
      currentTitle: 'Original Title',
      url: 'https://discord.com/123',
      parentChannel: 'General',
      firstSeenAt: 500000,
    };

    mockStore.getThreads.mockReturnValue({
      [existingThread.id]: existingThread,
    });

    simulateTitleChange(
      mockStore as unknown as ThreadStore,
      mockNotifier as unknown as Notifier,
      mockRefreshData
    );

    const recordedChange = mockStore.recordTitleChange.mock.calls[0][0];

    // Verify the new title is from the expected list
    const expectedTitles = [
      'Looking for Group - Weekly Raid',
      'Bug Report: Login Issues',
      'Feature Request: Dark Mode',
      'Community Event - Saturday',
      'Help Needed: Database Query',
      'Discussion: Best Practices',
      'Announcement: Server Maintenance',
      'Tutorial: Getting Started Guide',
    ];

    expect(expectedTitles).toContain(recordedChange.newTitle);
  });

  it('should pass multiple changes to notifier when notifying', () => {
    mockStore.getThreads.mockReturnValue({});

    simulateTitleChange(
      mockStore as unknown as ThreadStore,
      mockNotifier as unknown as Notifier,
      mockRefreshData
    );

    // Verify notifier receives an array with one change
    expect(mockNotifier.notifyAll).toHaveBeenCalledWith(expect.any(Array));
    expect(mockNotifier.notifyAll.mock.calls[0][0]).toHaveLength(1);
  });
});
