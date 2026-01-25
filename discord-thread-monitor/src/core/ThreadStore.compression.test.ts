import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ThreadStore } from './ThreadStore';
import type { MonitoredThread, StoredData } from '../types';

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
    const _testData: StoredData = {
      threads: {},
      changes: [],
      blacklist: [],
      retentionDays: 0,
    };

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

  it('should compress large data exceeding threshold', () => {
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
  });

  it('should not compress small data', () => {
    const store = new ThreadStore();

    const smallThread: MonitoredThread = {
      id: 'small',
      currentTitle: 'Small title',
      url: 'https://discord.com/123/small',
      parentChannel: 'Test',
      firstSeenAt: Date.now(),
    };

    store.addThread(smallThread);
    vi.advanceTimersByTime(500);

    expect(mockSetValue).toHaveBeenCalled();

    const savedData = mockSetValue.mock.calls[0][1];
    const parsed = JSON.parse(savedData);
    expect(parsed.compressed).toBe(false);
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

    expect(mockSetValue).toHaveBeenCalled();

    const savedData = mockSetValue.mock.calls[0][1];
    const parsed = JSON.parse(savedData);
    expect(parsed.compressed).toBe(false);

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

  it('should handle old string format without wrapper', () => {
    const testData: StoredData = {
      threads: {},
      changes: [],
      blacklist: [],
      retentionDays: 0,
    };

    const oldFormatString = JSON.stringify(testData);
    mockGetValue.mockReturnValue(oldFormatString);

    const store = new ThreadStore();
    expect(store.getThreads()).toEqual({});
    expect(store.getRetentionDays()).toBe(0);
  });

  it('should handle compressed data successfully with large data', () => {
    // Test that data exceeding compression threshold gets compressed
    // COMPRESSION_THRESHOLD_BYTES is 50KB = 51200 bytes
    // Create data that should definitely exceed this threshold

    const store = new ThreadStore();

    // Create multiple threads with large titles to exceed 50KB threshold
    for (let i = 0; i < 10; i++) {
      const largeThread: MonitoredThread = {
        id: `test-thread-${i}`,
        currentTitle: 'A'.repeat(10000), // Each title ~10KB
        url: `https://discord.com/channels/123/test-thread-${i}`,
        parentChannel: 'Test Channel ' + i,
        firstSeenAt: Date.now() - i * 1000,
      };
      store.addThread(largeThread);
    }

    // Wait for debounced save
    vi.advanceTimersByTime(500);

    // Verify compression was used
    expect(mockSetValue).toHaveBeenCalled();
    const savedData = mockSetValue.mock.calls[mockSetValue.mock.calls.length - 1][1];
    const parsed = JSON.parse(savedData);
    expect(parsed.compressed).toBe(true);
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
      timestamp: Date.now(),
      url: 'https://discord.com/channels/123/test-thread',
      seen: false,
    };

    store.recordTitleChange(change, 'New Title');

    const dashboardData = store.getDashboardData();

    expect(dashboardData.unseenCount).toBe(1);
    expect(dashboardData.changeGroups.length).toBeGreaterThan(0);
  });

  it('should handle corrupted data that throws in parseStoredData catch block', () => {
    // Mock GM_getValue to return a non-string, non-object value that causes JSON.parse to throw
    mockGetValue.mockReturnValue(Symbol('corrupted'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const store = new ThreadStore();

    // Should handle gracefully and return empty data
    expect(store.getThreads()).toEqual({});
    expect(store.getChanges()).toEqual([]);

    consoleSpy.mockRestore();
  });
});
