/* eslint-disable max-lines */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ThreadStore } from './ThreadStore';
import type { MonitoredThread, TitleChange, StoredData } from '../types';

// Create an in-memory storage to simulate GM storage behavior
let storage: Record<string, any> = {};

// Mock pako that actually compresses/decompresses in a way that's compatible with base64 encoding
vi.mock('pako', () => ({
  default: {
    deflate: vi.fn((input: string) => {
      // For mock purposes, just encode the string as UTF-8 bytes
      // In reality, pako would compress this, but for testing we just need
      // something that can round-trip through base64
      return new TextEncoder().encode(input);
    }),
    inflate: vi.fn((input: Uint8Array, options: { to: string }) => {
      // For mock purposes, just decode the UTF-8 bytes back to string
      // In reality, pako would decompress this
      if (options?.to === 'string') {
        return new TextDecoder().decode(input);
      }
      return input;
    }),
  },
}));

// Use a more controlled mock that doesn't share state unexpectedly
let mockGetValue: any;
let mockSetValue: any;

function setupMocks() {
  storage = {};

  mockGetValue = vi.fn((key: string, defaultValue?: any) => {
    return storage[key] !== undefined ? storage[key] : defaultValue;
  });

  mockSetValue = vi.fn((key: string, value: any) => {
    storage[key] = value;
  });

  vi.stubGlobal('GM_getValue', mockGetValue);
  vi.stubGlobal('GM_setValue', mockSetValue);
}

describe('ThreadStore', () => {
  beforeEach(() => {
    // Set up fresh mocks for each test
    setupMocks();

    vi.useFakeTimers();
  });

  afterEach(() => {
    // Clear all timers first to prevent any pending saves
    vi.clearAllTimers();

    // Restore real timers
    vi.useRealTimers();

    // Clear storage completely after each test
    storage = {};
  });

  describe('Initialization', () => {
    it('should initialize with empty data when no storage exists', () => {
      const store = new ThreadStore();
      expect(store.getThreads()).toEqual({});
      expect(store.getChanges()).toEqual([]);
      expect(store.getBlacklist()).toEqual([]);
      expect(store.getRetentionDays()).toBe(0);
    });

    it('should load existing data from storage', () => {
      const testData: StoredData = {
        threads: {
          '123': {
            id: '123',
            currentTitle: 'Test Thread',
            url: 'https://discord.com/channels/123/456',
            parentChannel: 'General',
            firstSeenAt: 1000,
          },
        },
        changes: [],
        blacklist: ['789'],
        retentionDays: 7,
      };

      mockGetValue.mockReturnValue(
        JSON.stringify({ compressed: false, data: JSON.stringify(testData) })
      );

      const store = new ThreadStore();
      const threads = store.getThreads();
      expect(threads['123'].currentTitle).toBe('Test Thread');
      expect(store.getBlacklist()).toContain('789');
      expect(store.getRetentionDays()).toBe(7);
    });

    it('should handle malformed storage data gracefully', () => {
      mockGetValue.mockReturnValue('invalid json');

      // Suppress the expected console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const store = new ThreadStore();
      expect(store.getThreads()).toEqual({});
      expect(store.getChanges()).toEqual([]);

      consoleSpy.mockRestore();
    });

    it('should handle null/undefined storage values', () => {
      mockGetValue.mockReturnValue(null);

      const store = new ThreadStore();
      expect(store.getThreads()).toEqual({});
    });

    it('should handle stored value === "undefined" string', () => {
      // This tests line 92: stored === 'undefined'
      mockGetValue.mockReturnValue('undefined');

      const store = new ThreadStore();
      expect(store.getThreads()).toEqual({});
      expect(store.getChanges()).toEqual([]);
    });

    it('should migrate old retentionMonths to retentionDays', () => {
      const oldData = {
        threads: {},
        changes: [],
        blacklist: [],
        retentionMonths: 2,
      };

      mockGetValue.mockReturnValue(
        JSON.stringify({ compressed: false, data: JSON.stringify(oldData) })
      );

      const store = new ThreadStore();
      expect(store.getRetentionDays()).toBe(60);
    });
  });

  describe('Thread Management', () => {
    let store: ThreadStore;

    beforeEach(() => {
      store = new ThreadStore();
    });

    it('should add a new thread', () => {
      const thread: MonitoredThread = {
        id: '123',
        currentTitle: 'Test Thread',
        url: 'https://discord.com/channels/123/456',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      store.addThread(thread);
      const threads = store.getThreads();

      expect(threads['123']).toEqual(thread);
      expect(store.getThread('123')).toEqual(thread);
    });

    it('should not add blacklisted threads', () => {
      const thread: MonitoredThread = {
        id: 'blacklisted',
        currentTitle: 'Test',
        url: 'https://discord.com/123/blacklisted',
        parentChannel: 'Test',
        firstSeenAt: 1000,
      };

      store.addToBlacklist('blacklisted');
      store.addThread(thread);

      expect(store.getThreads()).not.toHaveProperty('blacklisted');
    });

    it('should update thread title', () => {
      const thread: MonitoredThread = {
        id: '123',
        currentTitle: 'Old Title',
        url: 'https://discord.com/channels/123/456',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      store.addThread(thread);
      store.updateTitle('123', 'New Title');

      const updatedThread = store.getThread('123');
      expect(updatedThread?.currentTitle).toBe('New Title');
    });

    it('should handle updating non-existent thread', () => {
      expect(() => store.updateTitle('nonexistent', 'New Title')).not.toThrow();
    });

    it('should cache threads for performance', () => {
      const thread: MonitoredThread = {
        id: '123',
        currentTitle: 'Test',
        url: 'https://discord.com/123/456',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      store.addThread(thread);

      const firstCall = store.getThreads();
      const secondCall = store.getThreads();

      expect(firstCall).toBe(secondCall); // Should return cached reference
    });

    it('should invalidate cache when thread is modified', () => {
      const thread: MonitoredThread = {
        id: '123',
        currentTitle: 'Test',
        url: 'https://discord.com/123/456',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      store.addThread(thread);
      const firstCall = store.getThreads();

      store.updateTitle('123', 'Updated');
      const secondCall = store.getThreads();

      expect(firstCall).not.toBe(secondCall);
    });
  });

  describe('Change Management', () => {
    let store: ThreadStore;

    beforeEach(() => {
      // Set up fresh mocks for this test
      setupMocks();
      // Create new store instance
      store = new ThreadStore();
    });

    it('should record title changes', () => {
      const change: TitleChange = {
        threadId: '123',
        oldTitle: 'Old Title',
        newTitle: 'New Title',
        changedAt: 1000,
        seen: false,
      };

      store.recordTitleChange(change, 'New Title');

      const changes = store.getChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual(change);
    });

    it('should update thread title when recording change', () => {
      const thread: MonitoredThread = {
        id: '123',
        currentTitle: 'Old Title',
        url: 'https://discord.com/123/456',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      store.addThread(thread);

      const change: TitleChange = {
        threadId: '123',
        oldTitle: 'Old Title',
        newTitle: 'New Title',
        changedAt: 1000,
        seen: false,
      };

      store.recordTitleChange(change, 'New Title');

      const updatedThread = store.getThread('123');
      expect(updatedThread?.currentTitle).toBe('New Title');
    });

    it('should group changes by thread', () => {
      // Create fresh store instance for this test
      const freshStore = new ThreadStore();

      // Add threads first so they exist when grouping
      const thread123: MonitoredThread = {
        id: '123',
        currentTitle: 'Title 1',
        url: 'https://discord.com/channels/123/123',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      const thread456: MonitoredThread = {
        id: '456',
        currentTitle: 'Title A',
        url: 'https://discord.com/channels/123/456',
        parentChannel: 'Random',
        firstSeenAt: 2000,
      };

      freshStore.addThread(thread123);
      freshStore.addThread(thread456);

      const change1: TitleChange = {
        threadId: '123',
        oldTitle: 'Title 1',
        newTitle: 'Title 2',
        changedAt: 1000,
        seen: false,
      };

      const change2: TitleChange = {
        threadId: '123',
        oldTitle: 'Title 2',
        newTitle: 'Title 3',
        changedAt: 2000,
        seen: false,
      };

      const change3: TitleChange = {
        threadId: '456',
        oldTitle: 'Title A',
        newTitle: 'Title B',
        changedAt: 1500,
        seen: false,
      };

      freshStore.recordTitleChange(change1, 'Title 2');
      freshStore.recordTitleChange(change2, 'Title 3');
      freshStore.recordTitleChange(change3, 'Title B');

      const grouped = freshStore.getChangesGroupedByThread();

      expect(grouped).toHaveLength(2);

      const thread123Group = grouped.find((g) => g.threadId === '123');
      expect(thread123Group?.changes).toHaveLength(2);
      expect(thread123Group?.latestChangeAt).toBe(2000);

      const thread456Group = grouped.find((g) => g.threadId === '456');
      expect(thread456Group?.changes).toHaveLength(1);
    });

    it('should count unseen changes', () => {
      // Create fresh store instance for this test
      const freshStore = new ThreadStore();

      // Add threads first
      const thread1: MonitoredThread = {
        id: '123',
        currentTitle: 'Old',
        url: 'https://discord.com/channels/123/123',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      const thread2: MonitoredThread = {
        id: '456',
        currentTitle: 'Old',
        url: 'https://discord.com/channels/123/456',
        parentChannel: 'General',
        firstSeenAt: 2000,
      };

      freshStore.addThread(thread1);
      freshStore.addThread(thread2);

      const change1: TitleChange = {
        threadId: '123',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 1000,
        seen: false,
      };

      const change2: TitleChange = {
        threadId: '456',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 2000,
        seen: true,
      };

      freshStore.recordTitleChange(change1, 'New');
      freshStore.recordTitleChange(change2, 'New');

      expect(freshStore.getUnseenChangesCount()).toBe(1);
    });

    it('should mark changes as seen by thread', () => {
      // Create fresh store instance for this test
      const freshStore = new ThreadStore();

      // Add threads first
      const thread1: MonitoredThread = {
        id: '123',
        currentTitle: 'Old',
        url: 'https://discord.com/channels/123/123',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      const thread2: MonitoredThread = {
        id: '456',
        currentTitle: 'Old',
        url: 'https://discord.com/channels/123/456',
        parentChannel: 'General',
        firstSeenAt: 2000,
      };

      freshStore.addThread(thread1);
      freshStore.addThread(thread2);

      const change1: TitleChange = {
        threadId: '123',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 1000,
        seen: false,
      };

      const change2: TitleChange = {
        threadId: '456',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 2000,
        seen: false,
      };

      freshStore.recordTitleChange(change1, 'New');
      freshStore.recordTitleChange(change2, 'New');

      freshStore.markChangeSeen('123');

      const changes = freshStore.getChanges();
      expect(changes[0].seen).toBe(true);
      expect(changes[1].seen).toBe(false);
    });

    it('should mark all changes as seen', () => {
      // Add threads first
      const thread1: MonitoredThread = {
        id: '123',
        currentTitle: 'Old',
        url: 'https://discord.com/channels/123/123',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      const thread2: MonitoredThread = {
        id: '456',
        currentTitle: 'Old',
        url: 'https://discord.com/channels/123/456',
        parentChannel: 'General',
        firstSeenAt: 2000,
      };

      store.addThread(thread1);
      store.addThread(thread2);

      const change1: TitleChange = {
        threadId: '123',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 1000,
        seen: false,
      };

      const change2: TitleChange = {
        threadId: '456',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 2000,
        seen: false,
      };

      store.recordTitleChange(change1, 'New');
      store.recordTitleChange(change2, 'New');

      store.markAllChangesSeen();

      const changes = store.getChanges();
      expect(changes.every((c) => c.seen)).toBe(true);
    });

    it('should clear all changes', () => {
      // Create fresh store instance for this test
      const freshStore = new ThreadStore();

      // Add thread first
      const thread: MonitoredThread = {
        id: '123',
        currentTitle: 'Old',
        url: 'https://discord.com/channels/123/456',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      freshStore.addThread(thread);

      const change: TitleChange = {
        threadId: '123',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 1000,
        seen: false,
      };

      freshStore.recordTitleChange(change, 'New');
      expect(freshStore.getChanges()).toHaveLength(1);

      freshStore.clearChanges();
      expect(freshStore.getChanges()).toHaveLength(0);
    });
  });

  describe('Blacklist Management', () => {
    let store: ThreadStore;

    beforeEach(() => {
      setupMocks();
      store = new ThreadStore();
    });

    it('should add thread to blacklist', () => {
      store.addToBlacklist('123');

      expect(store.getBlacklist()).toContain('123');
      expect(store.isBlacklisted('123')).toBe(true);
    });

    it('should not add duplicate to blacklist', () => {
      // Create fresh store instance for this test
      const freshStore = new ThreadStore();

      freshStore.addToBlacklist('123');
      freshStore.addToBlacklist('123');

      expect(freshStore.getBlacklist()).toHaveLength(1);
      expect(freshStore.getBlacklist().filter((id) => id === '123')).toHaveLength(1);
    });

    it('should remove thread from blacklist', () => {
      store.addToBlacklist('123');
      store.removeFromBlacklist('123');

      expect(store.getBlacklist()).not.toContain('123');
      expect(store.isBlacklisted('123')).toBe(false);
    });

    it('should handle removing non-existent thread from blacklist', () => {
      expect(() => store.removeFromBlacklist('nonexistent')).not.toThrow();
    });

    it('should return blacklisted threads that are also monitored', () => {
      const thread: MonitoredThread = {
        id: '123',
        currentTitle: 'Test',
        url: 'https://discord.com/123/456',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      store.addThread(thread);
      store.addToBlacklist('123');

      const blacklistedThreads = store.getBlacklistedThreads();
      expect(blacklistedThreads).toHaveLength(1);
      expect(blacklistedThreads[0].id).toBe('123');
    });

    it('should filter out blacklisted threads from getThreads', () => {
      const thread1: MonitoredThread = {
        id: '123',
        currentTitle: 'Test 1',
        url: 'https://discord.com/123/456',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      const thread2: MonitoredThread = {
        id: '456',
        currentTitle: 'Test 2',
        url: 'https://discord.com/123/789',
        parentChannel: 'General',
        firstSeenAt: 2000,
      };

      store.addThread(thread1);
      store.addThread(thread2);
      store.addToBlacklist('123');

      const threads = store.getThreads();
      expect(threads).not.toHaveProperty('123');
      expect(threads).toHaveProperty('456');
    });
  });

  describe('Retention Policy', () => {
    let store: ThreadStore;

    beforeEach(() => {
      setupMocks();
      store = new ThreadStore();
    });

    it('should set retention days within valid range', () => {
      store.setRetentionDays(30);
      expect(store.getRetentionDays()).toBe(30);

      store.setRetentionDays(365);
      expect(store.getRetentionDays()).toBe(365);

      store.setRetentionDays(0);
      expect(store.getRetentionDays()).toBe(0);
    });

    it('should clamp retention days to valid range', () => {
      store.setRetentionDays(500);
      expect(store.getRetentionDays()).toBe(365);

      store.setRetentionDays(-10);
      expect(store.getRetentionDays()).toBe(1);
    });

    it('should clean up old changes when retention is reduced', () => {
      vi.setSystemTime(1000000);

      // Create fresh store instance for this test
      const freshStore = new ThreadStore();

      // Add threads first
      const thread1: MonitoredThread = {
        id: '123',
        currentTitle: 'Old',
        url: 'https://discord.com/channels/123/123',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      const thread2: MonitoredThread = {
        id: '456',
        currentTitle: 'Old',
        url: 'https://discord.com/channels/123/456',
        parentChannel: 'General',
        firstSeenAt: 2000,
      };

      freshStore.addThread(thread1);
      freshStore.addThread(thread2);

      const oldChange: TitleChange = {
        threadId: '123',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 1000000 - 8 * 24 * 60 * 60 * 1000, // 8 days ago
        seen: false,
      };

      const newChange: TitleChange = {
        threadId: '456',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 1000000 - 2 * 24 * 60 * 60 * 1000, // 2 days ago
        seen: false,
      };

      freshStore.recordTitleChange(oldChange, 'New');
      freshStore.recordTitleChange(newChange, 'New');

      expect(freshStore.getChanges()).toHaveLength(2);

      freshStore.setRetentionDays(7);

      const remainingChanges = freshStore.getChanges();
      expect(remainingChanges).toHaveLength(1);
      expect(remainingChanges[0].threadId).toBe('456');
    });

    it('should not clean changes when retention is 0 (unlimited)', () => {
      // Create fresh store instance for this test
      const freshStore = new ThreadStore();

      // Add thread first
      const thread: MonitoredThread = {
        id: '123',
        currentTitle: 'Old',
        url: 'https://discord.com/channels/123/456',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      freshStore.addThread(thread);

      const oldChange: TitleChange = {
        threadId: '123',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
        seen: false,
      };

      freshStore.recordTitleChange(oldChange, 'New');
      freshStore.setRetentionDays(0);

      expect(freshStore.getChanges()).toHaveLength(1);
    });
  });

  describe('Storage Info', () => {
    it('should return storage information', () => {
      // Create fresh store instance for this test
      const freshStore = new ThreadStore();

      const thread: MonitoredThread = {
        id: '123',
        currentTitle: 'Test',
        url: 'https://discord.com/123/456',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      freshStore.addThread(thread);

      // Force immediate save to populate storage info
      vi.advanceTimersByTime(500);

      const info = freshStore.getStorageInfo();

      expect(info).toHaveProperty('rawSize');
      expect(info).toHaveProperty('compressedSize');
      expect(info).toHaveProperty('isCompressed');
      expect(info).toHaveProperty('changeCount');
      expect(info).toHaveProperty('threadCount');
      expect(info.threadCount).toBe(1);
    });
  });

  describe('Debounced Save', () => {
    it('should debounce multiple save operations', () => {
      const store = new ThreadStore();

      const thread: MonitoredThread = {
        id: '123',
        currentTitle: 'Test',
        url: 'https://discord.com/123/456',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      // Add multiple threads quickly
      for (let i = 0; i < 5; i++) {
        thread.id = `thread${i}`;
        store.addThread(thread);
      }

      // Should not have saved yet due to debouncing
      expect(mockSetValue).not.toHaveBeenCalled();

      // Advance time past debounce threshold
      vi.advanceTimersByTime(500);

      // Should have saved once
      expect(mockSetValue).toHaveBeenCalledTimes(1);
    });

    it('should save immediately when requested', () => {
      const store = new ThreadStore();

      const thread: MonitoredThread = {
        id: '123',
        currentTitle: 'Test',
        url: 'https://discord.com/123/456',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      store.addThread(thread);
      store.clearChanges(); // This triggers immediate save

      expect(mockSetValue).toHaveBeenCalled();
    });
  });
});
