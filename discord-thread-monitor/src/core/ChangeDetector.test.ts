import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChangeDetector } from './ChangeDetector';
import type { MonitoredThread } from '../types';

// Mock ThreadStore
vi.mock('./ThreadStore', () => ({
  ThreadStore: vi.fn().mockImplementation(() => ({
    getThreads: vi.fn(),
    addThread: vi.fn(),
    recordTitleChange: vi.fn(),
  })),
}));

describe('ChangeDetector', () => {
  let changeDetector: ChangeDetector;
  let mockStore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore = {
      getThreads: vi.fn(),
      addThread: vi.fn(),
      recordTitleChange: vi.fn(),
    };

    // Create ChangeDetector with mocked store
    changeDetector = new ChangeDetector(mockStore);
  });

  describe('detectAndPersistChanges', () => {
    it('should return empty array when no current threads', () => {
      mockStore.getThreads.mockReturnValue({});

      const changes = changeDetector.detectAndPersistChanges([]);

      expect(changes).toEqual([]);
      expect(mockStore.getThreads).toHaveBeenCalled();
    });

    it('should detect title changes for existing threads', () => {
      const storedThreads: Record<string, MonitoredThread> = {
        '123': {
          id: '123',
          currentTitle: 'Old Title',
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
      };

      mockStore.getThreads.mockReturnValue(storedThreads);

      const currentThreads: MonitoredThread[] = [
        {
          id: '123',
          currentTitle: 'New Title',
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
      ];

      const changes = changeDetector.detectAndPersistChanges(currentThreads);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toMatchObject({
        threadId: '123',
        oldTitle: 'Old Title',
        newTitle: 'New Title',
        seen: false,
      });

      expect(mockStore.recordTitleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: '123',
          oldTitle: 'Old Title',
          newTitle: 'New Title',
        }),
        'New Title'
      );
    });

    it('should add new threads that are not in storage', () => {
      mockStore.getThreads.mockReturnValue({});

      const currentThreads: MonitoredThread[] = [
        {
          id: '123',
          currentTitle: 'New Thread',
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
      ];

      const changes = changeDetector.detectAndPersistChanges(currentThreads);

      expect(changes).toHaveLength(0);
      expect(mockStore.addThread).toHaveBeenCalledWith(currentThreads[0]);
      expect(mockStore.recordTitleChange).not.toHaveBeenCalled();
    });

    it('should not detect changes when titles are the same', () => {
      const storedThreads: Record<string, MonitoredThread> = {
        '123': {
          id: '123',
          currentTitle: 'Same Title',
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
      };

      mockStore.getThreads.mockReturnValue(storedThreads);

      const currentThreads: MonitoredThread[] = [
        {
          id: '123',
          currentTitle: 'Same Title',
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
      ];

      const changes = changeDetector.detectAndPersistChanges(currentThreads);

      expect(changes).toHaveLength(0);
      expect(mockStore.recordTitleChange).not.toHaveBeenCalled();
    });

    it('should handle multiple threads with mixed changes', () => {
      const storedThreads: Record<string, MonitoredThread> = {
        '123': {
          id: '123',
          currentTitle: 'Thread 1 Old',
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
        '456': {
          id: '456',
          currentTitle: 'Thread 2 Same',
          url: 'https://discord.com/channels/123/789',
          parentChannel: 'Random',
          firstSeenAt: 2000,
        },
      };

      mockStore.getThreads.mockReturnValue(storedThreads);

      const currentThreads: MonitoredThread[] = [
        {
          id: '123',
          currentTitle: 'Thread 1 New',
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
        {
          id: '456',
          currentTitle: 'Thread 2 Same',
          url: 'https://discord.com/channels/123/789',
          parentChannel: 'Random',
          firstSeenAt: 2000,
        },
        {
          id: '789',
          currentTitle: 'Thread 3 New',
          url: 'https://discord.com/channels/123/012',
          parentChannel: 'New',
          firstSeenAt: 3000,
        },
      ];

      const changes = changeDetector.detectAndPersistChanges(currentThreads);

      expect(changes).toHaveLength(1);
      expect(changes[0].threadId).toBe('123');
      expect(changes[0].oldTitle).toBe('Thread 1 Old');
      expect(changes[0].newTitle).toBe('Thread 1 New');

      expect(mockStore.addThread).toHaveBeenCalledWith(expect.objectContaining({ id: '789' }));
      expect(mockStore.recordTitleChange).toHaveBeenCalledTimes(1);
    });

    it('should detect changes when thread URL has changed', () => {
      const storedThreads: Record<string, MonitoredThread> = {
        '123': {
          id: '123',
          currentTitle: 'Test Thread',
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
      };

      mockStore.getThreads.mockReturnValue(storedThreads);

      // Only title changes are tracked, not URL changes
      const currentThreads: MonitoredThread[] = [
        {
          id: '123',
          currentTitle: 'Test Thread',
          url: 'https://discord.com/channels/123/999', // Different URL
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
      ];

      const changes = changeDetector.detectAndPersistChanges(currentThreads);

      expect(changes).toHaveLength(0);
    });

    it('should handle empty stored threads', () => {
      mockStore.getThreads.mockReturnValue({});

      const currentThreads: MonitoredThread[] = [
        {
          id: '123',
          currentTitle: 'Thread 1',
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
        {
          id: '456',
          currentTitle: 'Thread 2',
          url: 'https://discord.com/channels/123/789',
          parentChannel: 'Random',
          firstSeenAt: 2000,
        },
      ];

      const changes = changeDetector.detectAndPersistChanges(currentThreads);

      expect(changes).toHaveLength(0);
      expect(mockStore.addThread).toHaveBeenCalledTimes(2);
      expect(mockStore.recordTitleChange).not.toHaveBeenCalled();
    });

    it('should detect changes with special characters in titles', () => {
      const storedThreads: Record<string, MonitoredThread> = {
        '123': {
          id: '123',
          currentTitle: 'Test & <Title> with "quotes"',
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
      };

      mockStore.getThreads.mockReturnValue(storedThreads);

      const currentThreads: MonitoredThread[] = [
        {
          id: '123',
          currentTitle: 'Test & <Title> with "quotes" and more',
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
      ];

      const changes = changeDetector.detectAndPersistChanges(currentThreads);

      expect(changes).toHaveLength(1);
      expect(changes[0].oldTitle).toBe('Test & <Title> with "quotes"');
      expect(changes[0].newTitle).toBe('Test & <Title> with "quotes" and more');
    });

    it('should handle very long titles', () => {
      const longTitle1 = 'A'.repeat(500);
      const longTitle2 = 'B'.repeat(500);

      const storedThreads: Record<string, MonitoredThread> = {
        '123': {
          id: '123',
          currentTitle: longTitle1,
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
      };

      mockStore.getThreads.mockReturnValue(storedThreads);

      const currentThreads: MonitoredThread[] = [
        {
          id: '123',
          currentTitle: longTitle2,
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
      ];

      const changes = changeDetector.detectAndPersistChanges(currentThreads);

      expect(changes).toHaveLength(1);
      expect(changes[0].oldTitle).toBe(longTitle1);
      expect(changes[0].newTitle).toBe(longTitle2);
    });

    it('should maintain correct timestamp for changes', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const storedThreads: Record<string, MonitoredThread> = {
        '123': {
          id: '123',
          currentTitle: 'Old',
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
      };

      mockStore.getThreads.mockReturnValue(storedThreads);

      const currentThreads: MonitoredThread[] = [
        {
          id: '123',
          currentTitle: 'New',
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
      ];

      const changes = changeDetector.detectAndPersistChanges(currentThreads);

      expect(changes[0].changedAt).toBe(now);
    });

    it('should handle case where thread exists but title is empty string', () => {
      const storedThreads: Record<string, MonitoredThread> = {
        '123': {
          id: '123',
          currentTitle: 'Some Title',
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
      };

      mockStore.getThreads.mockReturnValue(storedThreads);

      const currentThreads: MonitoredThread[] = [
        {
          id: '123',
          currentTitle: '',
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
      ];

      const changes = changeDetector.detectAndPersistChanges(currentThreads);

      expect(changes).toHaveLength(1);
      expect(changes[0].oldTitle).toBe('Some Title');
      expect(changes[0].newTitle).toBe('');
    });

    it('should handle case where thread title changes from empty to non-empty', () => {
      const storedThreads: Record<string, MonitoredThread> = {
        '123': {
          id: '123',
          currentTitle: '',
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
      };

      mockStore.getThreads.mockReturnValue(storedThreads);

      const currentThreads: MonitoredThread[] = [
        {
          id: '123',
          currentTitle: 'New Title',
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
      ];

      const changes = changeDetector.detectAndPersistChanges(currentThreads);

      expect(changes).toHaveLength(1);
      expect(changes[0].oldTitle).toBe('');
      expect(changes[0].newTitle).toBe('New Title');
    });

    it('should process threads in order they appear', () => {
      const storedThreads: Record<string, MonitoredThread> = {
        '456': {
          id: '456',
          currentTitle: 'Title 2',
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'Random',
          firstSeenAt: 2000,
        },
        '123': {
          id: '123',
          currentTitle: 'Title 1',
          url: 'https://discord.com/channels/123/123',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
      };

      mockStore.getThreads.mockReturnValue(storedThreads);

      const currentThreads: MonitoredThread[] = [
        {
          id: '123',
          currentTitle: 'Title 1 New',
          url: 'https://discord.com/channels/123/123',
          parentChannel: 'General',
          firstSeenAt: 1000,
        },
        {
          id: '456',
          currentTitle: 'Title 2 New',
          url: 'https://discord.com/channels/123/456',
          parentChannel: 'Random',
          firstSeenAt: 2000,
        },
      ];

      const changes = changeDetector.detectAndPersistChanges(currentThreads);

      expect(changes).toHaveLength(2);
      expect(changes[0].threadId).toBe('123');
      expect(changes[1].threadId).toBe('456');
    });
  });
});
