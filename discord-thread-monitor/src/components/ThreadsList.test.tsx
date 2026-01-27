import { describe, it, expect } from 'vitest';
import { filterThreads } from '../utils/threadFilters';
import type { MonitoredThread } from '../types';

describe('ThreadsList filterThreads', () => {
  const mockThreads: MonitoredThread[] = [
    {
      id: '1',
      currentTitle: '中文标题测试',
      parentChannel: 'general',
      url: 'https://example.com/1',
      serverId: 'server1',
      firstSeenAt: Date.now(),
    },
    {
      id: '2',
      currentTitle: 'English Title',
      parentChannel: '技术讨论',
      url: 'https://example.com/2',
      serverId: 'server1',
      firstSeenAt: Date.now(),
    },
    {
      id: '3',
      currentTitle: '问题反馈',
      parentChannel: 'feedback',
      url: 'https://example.com/3',
      serverId: 'server1',
      firstSeenAt: Date.now(),
    },
    {
      id: '4',
      currentTitle: 'Bug Report',
      parentChannel: '开发者社区',
      url: 'https://example.com/4',
      serverId: 'server1',
      firstSeenAt: Date.now(),
    },
  ];

  describe('basic filtering', () => {
    it('returns all threads when query is empty', () => {
      expect(filterThreads(mockThreads, '')).toEqual(mockThreads);
    });

    it('filters by English text in title', () => {
      const result = filterThreads(mockThreads, 'English');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('filters by Chinese text in title', () => {
      const result = filterThreads(mockThreads, '中文');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('filters by channel name', () => {
      const result = filterThreads(mockThreads, 'general');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('is case insensitive for English', () => {
      const result = filterThreads(mockThreads, 'bug');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('4');
    });
  });

  describe('pinyin search', () => {
    it('matches full pinyin for title', () => {
      const result = filterThreads(mockThreads, 'zhongwen');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('matches first letters of pinyin for title', () => {
      const result = filterThreads(mockThreads, 'zwbt');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('matches full pinyin for channel', () => {
      const result = filterThreads(mockThreads, 'jishu');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('matches first letters of pinyin for channel', () => {
      const result = filterThreads(mockThreads, 'kfz');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('4');
    });

    it('matches mixed pinyin (full + first letters)', () => {
      const result = filterThreads(mockThreads, 'wentifk');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });
  });

  describe('edge cases', () => {
    it('returns empty array when no matches found', () => {
      const result = filterThreads(mockThreads, 'nonexistent');
      expect(result).toHaveLength(0);
    });

    it('handles special characters', () => {
      const result = filterThreads(mockThreads, 'Bug Report');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('4');
    });

    it('handles partial English matches', () => {
      const result = filterThreads(mockThreads, 'Engl');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });
  });
});
