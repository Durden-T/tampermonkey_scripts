/* eslint-disable max-lines */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ThreadStore } from './ThreadStore';
import type { MonitoredThread, TitleChange } from '../types';
import { openAppDB } from './db';
import { IDB } from '../constants';
import { resetPrefsStore } from './PrefsStore';

async function clearStores(): Promise<void> {
  const db = await openAppDB();
  const tx = db.transaction([IDB.DATA_STORE, IDB.PREFS_STORE], 'readwrite');
  await tx.objectStore(IDB.DATA_STORE).clear();
  await tx.objectStore(IDB.PREFS_STORE).clear();
  await tx.done;
  db.close();
}

// Mock pako that actually compresses/decompresses in a way that's compatible with base64 encoding
vi.mock('pako', () => ({
  default: {
    deflate: vi.fn((input: string) => {
      return new TextEncoder().encode(input);
    }),
    inflate: vi.fn((input: Uint8Array, options: { to: string }) => {
      if (options?.to === 'string') {
        return new TextDecoder().decode(input);
      }
      return input;
    }),
  },
}));

vi.mock('./PrefsStore', () => {
  const mockStore = new Map<string, unknown>();
  return {
    getPrefsStore: () => ({
      get: <T>(key: string): T | null => {
        const val = mockStore.get(key);
        return val === undefined ? null : (val as T);
      },
      set: (key: string, value: unknown): void => {
        mockStore.set(key, value);
      },
      remove: (key: string): void => {
        mockStore.delete(key);
      },
    }),
    initPrefsStore: async () => {
      // No-op for tests
    },
    resetPrefsStore: () => {
      mockStore.clear();
    },
  };
});

describe('ThreadStore', () => {
  beforeEach(async () => {
    await clearStores();
    resetPrefsStore();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with empty data when no storage exists', async () => {
      const store = await ThreadStore.create();
      expect(store.getThreads()).toEqual({});
      expect(store.getChanges()).toEqual([]);
      expect(store.getBlacklist()).toEqual([]);
      expect(store.getRetentionDays()).toBe(0);
    });

    it('should load existing data from storage', async () => {
      const compactData = {
        _v: 1,
        dict: ['123', '789'],
        threads: {
          0: {
            currentTitle: 'Test Thread',
            url: '123/456',
            parentChannel: 'General',
            firstSeenAt: 1000,
          },
        },
        changes: [],
        blacklist: [1],
        retentionDays: 7,
      };

      const jsonStr = JSON.stringify(compactData);
      const uint8 = new TextEncoder().encode(jsonStr);
      let binary = '';
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64 = btoa(binary);

      const db = await openAppDB();
      await db.put(IDB.DATA_STORE, { compressed: true, data: base64 }, IDB.DATA_KEY);
      await db.close();

      const store = await ThreadStore.create();
      const threads = store.getThreads();
      expect(threads['123'].currentTitle).toBe('Test Thread');
      expect(store.getBlacklist()).toContain('789');
      expect(store.getRetentionDays()).toBe(7);
    });

    it('should handle malformed storage data gracefully', async () => {
      const db = await openAppDB();
      await db.put(IDB.DATA_STORE, 'invalid json', IDB.DATA_KEY);
      await db.close();

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const store = await ThreadStore.create();
      expect(store.getThreads()).toEqual({});
      expect(store.getChanges()).toEqual([]);

      consoleSpy.mockRestore();
    });

    it('should handle null/undefined storage values', async () => {
      const store = await ThreadStore.create();
      expect(store.getThreads()).toEqual({});
    });
  });

  describe('Thread Management', () => {
    let store: ThreadStore;

    beforeEach(async () => {
      store = await ThreadStore.create();
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

      expect(firstCall).toBe(secondCall);
    });

    it('should invalidate cache when thread title is changed', () => {
      const thread: MonitoredThread = {
        id: '123',
        currentTitle: 'Test',
        url: 'https://discord.com/123/456',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      store.addThread(thread);
      const firstCall = store.getThreads();

      store.recordTitleChange(
        {
          threadId: '123',
          oldTitle: 'Test',
          newTitle: 'Updated',
          changedAt: Date.now(),
          seen: false,
        },
        'Updated'
      );
      const secondCall = store.getThreads();

      expect(firstCall).not.toBe(secondCall);
    });
  });

  describe('Change Management', () => {
    let store: ThreadStore;

    beforeEach(async () => {
      store = await ThreadStore.create();
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

    it('should group changes by thread', async () => {
      const freshStore = await ThreadStore.create();

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

    it('should count unseen changes', async () => {
      const freshStore = await ThreadStore.create();

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

    it('should mark changes as seen by thread', async () => {
      const freshStore = await ThreadStore.create();

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

    it('should clear all changes', async () => {
      const freshStore = await ThreadStore.create();

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

    beforeEach(async () => {
      store = await ThreadStore.create();
    });

    it('should add thread to blacklist', () => {
      store.addToBlacklist('123');

      expect(store.getBlacklist()).toContain('123');
      expect(store.isBlacklisted('123')).toBe(true);
    });

    it('should not add duplicate to blacklist', async () => {
      const freshStore = await ThreadStore.create();

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

    beforeEach(async () => {
      store = await ThreadStore.create();
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

      expect(() => store.setRetentionDays(-10)).toThrow(
        'Retention days must be a finite non-negative number'
      );
      expect(() => store.setRetentionDays(NaN)).toThrow(
        'Retention days must be a finite non-negative number'
      );
      expect(() => store.setRetentionDays(Infinity)).toThrow(
        'Retention days must be a finite non-negative number'
      );
    });

    it('should clean up old changes when retention is reduced', async () => {
      vi.setSystemTime(1000000);

      const freshStore = await ThreadStore.create();

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

    it('should not clean changes when retention is 0 (unlimited)', async () => {
      const freshStore = await ThreadStore.create();

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
    it('should return storage information', async () => {
      const freshStore = await ThreadStore.create();
      vi.useFakeTimers();

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
    it('should debounce multiple save operations', async () => {
      const store = await ThreadStore.create();

      const thread: MonitoredThread = {
        id: '123',
        currentTitle: 'Test',
        url: 'https://discord.com/123/456',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      for (let i = 0; i < 5; i++) {
        thread.id = `thread${i}`;
        store.addThread(thread);
      }

      // Debounce delay (300ms) has not elapsed yet, so IDB should be empty
      const db = await openAppDB();
      const savedBefore = await db.get(IDB.DATA_STORE, IDB.DATA_KEY);
      db.close();
      expect(savedBefore).toBeUndefined();

      // flush() cancels pending debounce and saves immediately
      await store.flush();
      const db2 = await openAppDB();
      const savedAfter = await db2.get(IDB.DATA_STORE, IDB.DATA_KEY);
      db2.close();
      expect(savedAfter).toBeDefined();
    });

    it('should save immediately when requested', async () => {
      const store = await ThreadStore.create();

      const thread: MonitoredThread = {
        id: '123',
        currentTitle: 'Test',
        url: 'https://discord.com/123/456',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      store.addThread(thread);
      store.clearChanges();

      await store.flush();
      const db = await openAppDB();
      const saved = await db.get(IDB.DATA_STORE, IDB.DATA_KEY);
      db.close();
      expect(saved).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle corrupted saved data gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const db = await openAppDB();
      await db.put(IDB.DATA_STORE, 'corrupted json', IDB.DATA_KEY);
      await db.close();

      const store = await ThreadStore.create();
      expect(store.getThreads()).toEqual({});

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load data from storage:',
        expect.any(SyntaxError)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getDashboardData', () => {
    it('should return combined data in single pass', async () => {
      const store = await ThreadStore.create();

      const thread1: MonitoredThread = {
        id: '123',
        currentTitle: 'Test 1',
        url: 'https://discord.com/123/123',
        parentChannel: 'General',
        firstSeenAt: 1000,
      };

      const thread2: MonitoredThread = {
        id: '456',
        currentTitle: 'Test 2',
        url: 'https://discord.com/123/456',
        parentChannel: 'Random',
        firstSeenAt: 2000,
      };

      store.addThread(thread1);
      store.addThread(thread2);

      const change1: TitleChange = {
        threadId: '123',
        oldTitle: 'Old 1',
        newTitle: 'New 1',
        changedAt: 1000,
        seen: false,
      };

      const change2: TitleChange = {
        threadId: '456',
        oldTitle: 'Old 2',
        newTitle: 'New 2',
        changedAt: 2000,
        seen: true,
      };

      store.recordTitleChange(change1, 'New 1');
      store.recordTitleChange(change2, 'New 2');

      const dashboardData = store.getDashboardData();

      expect(dashboardData.unseenCount).toBe(1);
      expect(dashboardData.changeGroups).toHaveLength(2);
      expect(dashboardData.storageInfo).toBeDefined();
      expect(dashboardData.storageInfo.threadCount).toBe(2);
      expect(dashboardData.storageInfo.changeCount).toBe(2);
    });

    it('should handle empty dashboard data', async () => {
      const store = await ThreadStore.create();

      const dashboardData = store.getDashboardData();

      expect(dashboardData.unseenCount).toBe(0);
      expect(dashboardData.changeGroups).toHaveLength(0);
      expect(dashboardData.storageInfo.threadCount).toBe(0);
      expect(dashboardData.storageInfo.changeCount).toBe(0);
    });
  });
});
