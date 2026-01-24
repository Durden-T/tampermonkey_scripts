import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThreadStore } from './ThreadStore';
import type { MonitoredThread } from '../types';

vi.mock('pako', () => ({
  default: {
    deflate: vi.fn((input: string) => new TextEncoder().encode(input)),
    inflate: vi.fn((input: Uint8Array, options: { to: string }) => {
      if (options.to === 'string') {
        return new TextDecoder().decode(input);
      }
      return input;
    }),
  },
}));

const mockGetValue = vi.fn();
const mockSetValue = vi.fn();

vi.stubGlobal('GM_getValue', mockGetValue);
vi.stubGlobal('GM_setValue', mockSetValue);

describe('ThreadStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetValue.mockReturnValue(null);
  });

  it('should initialize with empty data when no storage exists', () => {
    const store = new ThreadStore();
    expect(store.getThreads()).toEqual({});
    expect(store.getChanges()).toEqual([]);
    expect(store.getBlacklist()).toEqual([]);
  });
});
