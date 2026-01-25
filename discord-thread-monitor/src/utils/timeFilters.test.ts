import { describe, it, expect } from 'vitest';
import {
  parseTimeFilter,
  filterChangeGroupsByTime,
  TIME_PERIOD_MS,
  TIME_PERIODS,
} from './timeFilters';
import type { ThreadChangeGroup, TitleChange } from '../types';
import { TIME_MS } from '../constants';

describe('timeFilters', () => {
  describe('TIME_PERIOD_MS', () => {
    it('should have correct millisecond values', () => {
      expect(TIME_PERIOD_MS.week).toBe(604800000); // 7 * 24 * 60 * 60 * 1000
      expect(TIME_PERIOD_MS.month).toBe(2592000000); // 30 * 24 * 60 * 60 * 1000
      expect(TIME_PERIOD_MS.month3).toBe(7776000000); // 90 * 24 * 60 * 60 * 1000
    });
  });

  describe('TIME_PERIODS', () => {
    it('should contain all expected time periods', () => {
      expect(TIME_PERIODS).toEqual(['week', 'month', 'month3']);
    });
  });

  describe('parseTimeFilter', () => {
    it('should return null for "all" filter', () => {
      const result = parseTimeFilter('all');
      expect(result).toBeNull();
    });

    it('should parse valid time filters correctly', () => {
      expect(parseTimeFilter('week_older')).toEqual({ period: 'week', mode: 'older' });
      expect(parseTimeFilter('month_within')).toEqual({ period: 'month', mode: 'within' });
      expect(parseTimeFilter('month3_older')).toEqual({ period: 'month3', mode: 'older' });
    });
  });

  describe('filterChangeGroupsByTime', () => {
    // Helper to create mock change groups
    const createMockGroup = (
      threadId: string,
      changeTime: number,
      seen: boolean = false
    ): ThreadChangeGroup => {
      const change: TitleChange = {
        threadId,
        oldTitle: 'Old Title',
        newTitle: 'New Title',
        changedAt: changeTime,
        seen,
      };

      return {
        threadId,
        thread: {
          id: threadId,
          currentTitle: 'New Title',
          url: `https://discord.com/channels/123/${threadId}`,
          parentChannel: 'Test',
          firstSeenAt: changeTime - 1000,
        },
        changes: [change],
        latestChangeAt: changeTime,
        hasUnseen: !seen,
      };
    };

    const now = 1000000000000; // Fixed timestamp for testing

    it('should return all groups sorted by latestChangeAt when filter is "all"', () => {
      const groups = [
        createMockGroup('thread1', now - 1000),
        createMockGroup('thread3', now - 2000),
        createMockGroup('thread2', now - 5000),
      ];

      const result = filterChangeGroupsByTime(groups, 'all', now);

      expect(result).toHaveLength(3);
      expect(result[0].threadId).toBe('thread1'); // Most recent
      expect(result[1].threadId).toBe('thread3');
      expect(result[2].threadId).toBe('thread2');
    });

    it('should filter changes older than week', () => {
      const threeDaysAgo = now - TIME_MS.DAY * 3;
      const eightDaysAgo = now - TIME_MS.DAY * 8;
      const tenDaysAgo = now - TIME_MS.DAY * 10;

      const groups = [
        createMockGroup('thread1', threeDaysAgo), // Within week
        createMockGroup('thread2', eightDaysAgo), // Older than week
        createMockGroup('thread3', tenDaysAgo), // Much older than week
      ];

      const result = filterChangeGroupsByTime(groups, 'week_older', now);

      expect(result).toHaveLength(2); // thread2 and thread3 are older than week
      expect(result.map((g) => g.threadId)).toContain('thread2');
      expect(result.map((g) => g.threadId)).toContain('thread3');
    });

    it('should filter changes older than month', () => {
      const twoWeeksAgo = now - TIME_MS.DAY * 14;
      const thirtyFiveDaysAgo = now - TIME_MS.DAY * 35;
      const fortyDaysAgo = now - TIME_MS.DAY * 40;

      const groups = [
        createMockGroup('thread1', twoWeeksAgo), // Within month
        createMockGroup('thread2', thirtyFiveDaysAgo), // Older than month
        createMockGroup('thread3', fortyDaysAgo), // Much older than month
      ];

      const result = filterChangeGroupsByTime(groups, 'month_older', now);

      expect(result).toHaveLength(2); // thread2 and thread3 are older than month
      expect(result.map((g) => g.threadId)).toContain('thread2');
      expect(result.map((g) => g.threadId)).toContain('thread3');
    });

    it('should filter changes older than 3 months', () => {
      const twoMonthsAgo = now - TIME_MS.DAY * 60;
      const fourMonthsAgo = now - TIME_MS.DAY * 120;
      const fiveMonthsAgo = now - TIME_MS.DAY * 150;

      const groups = [
        createMockGroup('thread1', twoMonthsAgo), // Within 3 months
        createMockGroup('thread2', fourMonthsAgo), // Older than 3 months
        createMockGroup('thread3', fiveMonthsAgo), // Much older than 3 months
      ];

      const result = filterChangeGroupsByTime(groups, 'month3_older', now);

      expect(result).toHaveLength(2); // thread2 and thread3 are older than 3 months
      expect(result.map((g) => g.threadId)).toContain('thread2');
      expect(result.map((g) => g.threadId)).toContain('thread3');
    });

    it('should filter changes within week', () => {
      const threeDaysAgo = now - TIME_MS.DAY * 3;
      const eightDaysAgo = now - TIME_MS.DAY * 8;

      const groups = [
        createMockGroup('thread1', threeDaysAgo), // Within week
        createMockGroup('thread2', eightDaysAgo), // Older than week
      ];

      const result = filterChangeGroupsByTime(groups, 'week_within', now);

      expect(result).toHaveLength(1);
      expect(result[0].threadId).toBe('thread1');
    });

    it('should filter changes within month', () => {
      const twoWeeksAgo = now - TIME_MS.DAY * 14;
      const thirtyFiveDaysAgo = now - TIME_MS.DAY * 35;

      const groups = [
        createMockGroup('thread1', twoWeeksAgo), // Within month
        createMockGroup('thread2', thirtyFiveDaysAgo), // Older than month
      ];

      const result = filterChangeGroupsByTime(groups, 'month_within', now);

      expect(result).toHaveLength(1);
      expect(result[0].threadId).toBe('thread1');
    });

    it('should filter changes within 3 months', () => {
      const twoMonthsAgo = now - TIME_MS.DAY * 60;
      const fourMonthsAgo = now - TIME_MS.DAY * 120;

      const groups = [
        createMockGroup('thread1', twoMonthsAgo), // Within 3 months
        createMockGroup('thread2', fourMonthsAgo), // Older than 3 months
      ];

      const result = filterChangeGroupsByTime(groups, 'month3_within', now);

      expect(result).toHaveLength(1);
      expect(result[0].threadId).toBe('thread1');
    });

    it('should filter out groups with no changes after filtering', () => {
      const threeDaysAgo = now - TIME_PERIOD_MS.week / 2;
      const eightDaysAgo = now - TIME_PERIOD_MS.week - 86400000;

      // Group with changes, all outside time range (older than week)
      const group1: ThreadChangeGroup = {
        threadId: 'thread1',
        thread: {
          id: 'thread1',
          currentTitle: 'Test',
          url: 'https://discord.com/123/thread1',
          parentChannel: 'Test',
          firstSeenAt: threeDaysAgo,
        },
        changes: [
          {
            threadId: 'thread1',
            oldTitle: 'Old',
            newTitle: 'New',
            changedAt: eightDaysAgo, // Outside range (> 1 week ago)
            seen: false,
          },
        ],
        latestChangeAt: eightDaysAgo,
        hasUnseen: true,
      };

      // Group with changes, all within time range (< 1 week ago)
      const group2: ThreadChangeGroup = {
        threadId: 'thread2',
        thread: {
          id: 'thread2',
          currentTitle: 'Test',
          url: 'https://discord.com/123/thread2',
          parentChannel: 'Test',
          firstSeenAt: threeDaysAgo,
        },
        changes: [
          {
            threadId: 'thread2',
            oldTitle: 'Old',
            newTitle: 'New',
            changedAt: now - 1000, // Well within range
            seen: false,
          },
        ],
        latestChangeAt: now - 1000,
        hasUnseen: true,
      };

      const result = filterChangeGroupsByTime([group1, group2], 'week_within', now);

      expect(result).toHaveLength(1);
      expect(result[0].threadId).toBe('thread2');
    });

    it('should update latestChangeAt and hasUnseen for filtered groups', () => {
      const testNow = 1000000000000;
      const threeDaysAgo = testNow - TIME_MS.DAY * 3;
      const eightDaysAgo = testNow - TIME_MS.DAY * 8;

      const group: ThreadChangeGroup = {
        threadId: 'thread1',
        thread: {
          id: 'thread1',
          currentTitle: 'Test',
          url: 'https://discord.com/123/thread1',
          parentChannel: 'Test',
          firstSeenAt: threeDaysAgo,
        },
        changes: [
          {
            threadId: 'thread1',
            oldTitle: 'Old',
            newTitle: 'New 1',
            changedAt: eightDaysAgo, // Outside range (> 1 week ago)
            seen: true,
          },
          {
            threadId: 'thread1',
            oldTitle: 'New 1',
            newTitle: 'New 2',
            changedAt: testNow - 1000, // Within range (< 1 week ago)
            seen: false,
          },
        ],
        latestChangeAt: testNow - 1000,
        hasUnseen: true,
      };

      const result = filterChangeGroupsByTime([group], 'week_within', testNow);

      expect(result).toHaveLength(1);
      expect(result[0].latestChangeAt).toBe(testNow - 1000);
      expect(result[0].hasUnseen).toBe(true);
      expect(result[0].changes).toHaveLength(1);
      expect(result[0].changes[0].changedAt).toBe(testNow - 1000);
    });

    it('should handle empty groups array', () => {
      const result = filterChangeGroupsByTime([], 'week_within', now);
      expect(result).toEqual([]);
    });

    it('should handle groups with no matching changes', () => {
      const eightDaysAgo = now - TIME_MS.DAY * 8;
      const groups = [
        createMockGroup('thread1', eightDaysAgo), // Older than week
      ];

      const result = filterChangeGroupsByTime(groups, 'week_within', now);
      expect(result).toEqual([]);
    });

    it('should handle "all" filter with empty groups', () => {
      const result = filterChangeGroupsByTime([], 'all', now);
      expect(result).toEqual([]);
    });

    it('should sort by latestChangeAt in descending order for within filters', () => {
      const oneHourAgo = now - 3600000;
      const twoHoursAgo = now - 7200000;
      const threeHoursAgo = now - 10800000;

      const groups = [
        createMockGroup('thread1', threeHoursAgo),
        createMockGroup('thread2', oneHourAgo),
        createMockGroup('thread3', twoHoursAgo),
      ];

      const result = filterChangeGroupsByTime(groups, 'week_within', now);

      expect(result).toHaveLength(3);
      expect(result[0].threadId).toBe('thread2'); // Most recent
      expect(result[1].threadId).toBe('thread3');
      expect(result[2].threadId).toBe('thread1');
    });

    it('should handle null parsed result gracefully', () => {
      // Test case for line 37: if (!parsed)
      // This tests the case where parseTimeFilter returns null
      // We can only test this with the 'all' filter which is already handled earlier
      // But let's add a more explicit test

      const groups = [
        createMockGroup('thread1', now - 1000),
        createMockGroup('thread2', now - 2000),
      ];

      const result = filterChangeGroupsByTime(groups, 'all', now);

      // Should return all groups sorted by latestChangeAt descending
      expect(result).toHaveLength(2);
      expect(result[0].threadId).toBe('thread1'); // Most recent
      expect(result[1].threadId).toBe('thread2');
    });
  });
});
