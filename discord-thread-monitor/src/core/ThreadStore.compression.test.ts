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
});
