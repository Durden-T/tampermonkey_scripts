import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ThreadStore } from './ThreadStore';
import type { MonitoredThread, TitleChange } from '../types';

let storage: Record<string, any> = {};

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

describe('ThreadStore Compression', () => {
  beforeEach(() => {
    setupMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    storage = {};
  });

  it('should decompress compressed data from storage', () => {
    mockGetValue.mockReturnValue(JSON.stringify({ compressed: true, data: 'compresseddata' }));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const store = new ThreadStore();
    expect(store.getThreads()).toEqual({});

    consoleSpy.mockRestore();
  });

  it('should handle decompression errors gracefully', () => {
    mockGetValue.mockReturnValue('{"compressed":true,"data":"invalid"}');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const store = new ThreadStore();

    expect(store.getThreads()).toEqual({});
    expect(store.getChanges()).toEqual([]);
    expect(store.getBlacklist()).toEqual([]);

    consoleSpy.mockRestore();
  });

  it('should compress all data', () => {
    const store = new ThreadStore();

    const largeTitle = 'A'.repeat(2000);
    const largeThread: MonitoredThread = {
      id: 'large',
      currentTitle: largeTitle,
      url: 'https://discord.com/123/large',
      parentChannel: 'Test',
      firstSeenAt: Date.now(),
    };

    store.addThread(largeThread);
    vi.advanceTimersByTime(500);

    expect(mockSetValue).toHaveBeenCalled();

    const savedData = mockSetValue.mock.calls[0][1];
    const parsed = JSON.parse(savedData);
    expect(parsed).toHaveProperty('compressed');
    expect(parsed).toHaveProperty('data');
    expect(parsed.compressed).toBe(true);
  });

  it('should handle compression failure gracefully', async () => {
    const pako = await import('pako');
    const originalDeflate = (pako as any).default.deflate;
    (pako as any).default.deflate = vi.fn(() => {
      throw new Error('Compression failed');
    });

    const store = new ThreadStore();

    const largeTitle = 'A'.repeat(2000);
    const largeThread: MonitoredThread = {
      id: 'large',
      currentTitle: largeTitle,
      url: 'https://discord.com/123/large',
      parentChannel: 'Test',
      firstSeenAt: Date.now(),
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    store.addThread(largeThread);
    vi.advanceTimersByTime(500);

    expect(consoleSpy).toHaveBeenCalledWith('Failed to save data to storage:', expect.any(Error));

    consoleSpy.mockRestore();

    (pako as any).default.deflate = originalDeflate;
  });

  it('should handle compressed storage with invalid JSON', async () => {
    const pako = await import('pako');
    const originalInflate = (pako as any).default.inflate;
    (pako as any).default.inflate = vi.fn(() => {
      return 'invalid json data {';
    });

    mockGetValue.mockReturnValue(JSON.stringify({ compressed: true, data: 'somecompresseddata' }));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const store = new ThreadStore();
    expect(store.getThreads()).toEqual({});
    expect(store.getChanges()).toEqual([]);

    consoleSpy.mockRestore();

    (pako as any).default.inflate = originalInflate;
  });

  it('should handle getDashboardData with empty changes array', () => {
    const store = new ThreadStore();

    const dashboardData = store.getDashboardData();

    expect(dashboardData).toHaveProperty('unseenCount');
    expect(dashboardData).toHaveProperty('changeGroups');
    expect(dashboardData).toHaveProperty('storageInfo');
    expect(dashboardData.unseenCount).toBe(0);
    expect(dashboardData.changeGroups).toEqual([]);
  });

  it('should handle getDashboardData with unseen changes', () => {
    const store = new ThreadStore();

    const thread: MonitoredThread = {
      id: 'test-thread',
      currentTitle: 'Test Title',
      url: 'https://discord.com/channels/123/test-thread',
      parentChannel: 'Test Channel',
      firstSeenAt: Date.now(),
    };

    store.addThread(thread);

    const change: TitleChange = {
      threadId: 'test-thread',
      oldTitle: 'Old Title',
      newTitle: 'New Title',
      changedAt: Date.now(),
      seen: false,
    };

    store.recordTitleChange(change, 'New Title');

    const dashboardData = store.getDashboardData();

    expect(dashboardData.unseenCount).toBe(1);
    expect(dashboardData.changeGroups.length).toBeGreaterThan(0);
  });

  it('should handle corrupted data that throws in parseStoredData catch block', () => {
    mockGetValue.mockReturnValue(Symbol('corrupted'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const store = new ThreadStore();

    expect(store.getThreads()).toEqual({});
    expect(store.getChanges()).toEqual([]);

    consoleSpy.mockRestore();
  });

  it('should use threadId dictionary encoding in v3 format', () => {
    const store = new ThreadStore();

    const thread1: MonitoredThread = {
      id: 'thread-1',
      currentTitle: 'Thread 1',
      url: 'https://discord.com/channels/123/thread-1',
      parentChannel: 'Channel',
      firstSeenAt: 1700000000000,
    };

    const thread2: MonitoredThread = {
      id: 'thread-2',
      currentTitle: 'Thread 2',
      url: 'https://discord.com/channels/123/thread-2',
      parentChannel: 'Channel',
      firstSeenAt: 1700005000000,
    };

    store.addThreads([thread1, thread2]);
    store.addToBlacklist('thread-2');
    store.recordTitleChange(
      {
        threadId: 'thread-1',
        oldTitle: 'Thread 1',
        newTitle: 'Updated Thread 1',
        changedAt: 1700010000000,
        seen: false,
      },
      'Updated Thread 1'
    );

    vi.advanceTimersByTime(500);

    expect(mockSetValue).toHaveBeenCalled();
    const savedData = mockSetValue.mock.calls[mockSetValue.mock.calls.length - 1][1];
    const wrapper = JSON.parse(savedData);
    expect(wrapper.compressed).toBe(true);

    const decompressed = atob(wrapper.data);
    const uint8 = new Uint8Array(decompressed.length);
    for (let i = 0; i < decompressed.length; i++) {
      uint8[i] = decompressed.charCodeAt(i);
    }
    const inflated = new TextDecoder().decode(uint8);
    const compactData = JSON.parse(inflated);

    expect(compactData._v).toBe(1);
    expect(compactData.dict).toEqual(['thread-1', 'thread-2']);
    expect(compactData.threads['0']).toBeDefined();
    expect(compactData.threads['1']).toBeDefined();
    expect(compactData.changes[0].t).toBe(0);
    expect(compactData.changes[0].o).toBe('Thread 1');
    expect(compactData.changes[0].n).toBe('Updated Thread 1');
    expect(compactData.blacklist).toEqual([1]);
  });

  it('should restore v3 threadId dictionary correctly', () => {
    const compactData = {
      _v: 1,
      dict: ['thread-1', 'thread-2'],
      threads: {
        0: {
          currentTitle: 'Thread 1',
          url: '123/thread-1',
          parentChannel: 'Channel',
          firstSeenAt: 1700000000000,
        },
        1: {
          currentTitle: 'Thread 2',
          url: '123/thread-2',
          parentChannel: 'Channel',
          firstSeenAt: 1700005000000,
        },
      },
      changes: [
        {
          t: 0,
          o: 'Thread 1',
          n: 'Updated',
          c: 1700010000000,
        },
      ],
      blacklist: [1],
      retentionDays: 0,
    };

    const jsonStr = JSON.stringify(compactData);
    const uint8 = new TextEncoder().encode(jsonStr);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64 = btoa(binary);

    const wrapper = {
      compressed: true,
      data: base64,
    };

    mockGetValue.mockReturnValue(JSON.stringify(wrapper));

    const store = new ThreadStore();
    const threads = store.getThreads();

    expect(threads['thread-1']).toBeDefined();
    expect(threads['thread-1'].currentTitle).toBe('Thread 1');
    expect(threads['thread-1'].firstSeenAt).toBe(1700000000000);
    expect(threads['thread-2']).toBeUndefined();

    const changes = store.getChanges();
    expect(changes[0].threadId).toBe('thread-1');
    expect(changes[0].changedAt).toBe(1700010000000);

    const blacklist = store.getBlacklist();
    expect(blacklist).toEqual(['thread-2']);
  });
});
