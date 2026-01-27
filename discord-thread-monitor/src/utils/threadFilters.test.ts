import { describe, it, expect } from 'vitest';
import { matchesQuery, filterThreads } from './threadFilters';
import type { MonitoredThread } from '../types';

describe('threadFilters', () => {
  describe('matchesQuery', () => {
    describe('basic text matching', () => {
      it('returns true for exact match', () => {
        expect(matchesQuery('test', 'test')).toBe(true);
      });

      it('returns true for partial match', () => {
        expect(matchesQuery('testing', 'test')).toBe(true);
      });

      it('returns false for no match', () => {
        expect(matchesQuery('hello', 'world')).toBe(false);
      });

      it('is case insensitive', () => {
        expect(matchesQuery('Test', 'TEST')).toBe(true);
      });

      it('returns false for empty query', () => {
        expect(matchesQuery('test', '')).toBe(false);
      });

      it('returns false for whitespace-only query', () => {
        expect(matchesQuery('test', '   ')).toBe(false);
      });

      it('returns false for very long queries', () => {
        const longQuery = 'a'.repeat(201);
        expect(matchesQuery('test', longQuery)).toBe(false);
      });
    });

    describe('pinyin matching', () => {
      it('matches full pinyin for Chinese text', () => {
        expect(matchesQuery('中文', 'zhongwen')).toBe(true);
      });

      it('matches first letters for Chinese text', () => {
        expect(matchesQuery('中文', 'zw')).toBe(true);
      });

      it('does not attempt pinyin match for English-only text', () => {
        expect(matchesQuery('English', 'yingwen')).toBe(false);
      });

      it('matches substring in mixed Chinese-English text', () => {
        expect(matchesQuery('中文 Test', 'test')).toBe(true);
      });

      it('matches pinyin in mixed Chinese-English text', () => {
        expect(matchesQuery('中文 Test', 'zhong')).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('handles special characters in query', () => {
        expect(matchesQuery('test-file', 'test-')).toBe(true);
      });

      it('handles numbers', () => {
        expect(matchesQuery('test123', '123')).toBe(true);
      });

      it('handles Unicode characters', () => {
        expect(matchesQuery('café', 'café')).toBe(true);
      });
    });
  });

  describe('filterThreads', () => {
    const mockThreads: MonitoredThread[] = [
      {
        id: '1',
        currentTitle: '中文标题',
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
        currentTitle: 'Bug Report',
        parentChannel: 'feedback',
        url: 'https://example.com/3',
        serverId: 'server1',
        firstSeenAt: Date.now(),
      },
    ];

    it('returns all threads when query is empty', () => {
      expect(filterThreads(mockThreads, '')).toEqual(mockThreads);
    });

    it('filters by title text match', () => {
      const result = filterThreads(mockThreads, 'English');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('filters by channel text match', () => {
      const result = filterThreads(mockThreads, 'general');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('filters by pinyin match on title', () => {
      const result = filterThreads(mockThreads, 'zhongwen');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('filters by pinyin match on channel', () => {
      const result = filterThreads(mockThreads, 'jishu');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('returns empty array when no matches found', () => {
      const result = filterThreads(mockThreads, 'nonexistent');
      expect(result).toHaveLength(0);
    });

    it('is case insensitive', () => {
      const result = filterThreads(mockThreads, 'bug');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });
  });
});
