import { describe, it, expect } from 'vitest';
import {
  parseTimeFilter,
  filterChangeGroupsByTime,
  TIME_PERIOD_MS,
  TIME_PERIODS,
} from './timeFilters';
import type { ThreadChangeGroup, TitleChange } from '../types';

describe('timeFilters', () => {
  describe('TIME_PERIOD_MS', () => {
    it('should have correct millisecond values', () => {
      expect(TIME_PERIOD_MS.day).toBe(86400000); // 24 * 60 * 60 * 1000
      expect(TIME_PERIOD_MS.week).toBe(604800000); // 7 * 24 * 60 * 60 * 1000
      expect(TIME_PERIOD_MS.month).toBe(2592000000); // 30 * 24 * 60 * 60 * 1000
      expect(TIME_PERIOD_MS.month3).toBe(7776000000); // 90 * 24 * 60 * 60 * 1000
      expect(TIME_PERIOD_MS.month6).toBe(15552000000); // 180 * 24 * 60 * 60 * 1000
      expect(TIME_PERIOD_MS.year).toBe(31536000000); // 365 * 24 * 60 * 60 * 1000
    });
  });

  describe('TIME_PERIODS', () => {
    it('should contain all expected time periods', () => {
      expect(TIME_PERIODS).toEqual(['day', 'week', 'month', 'month3', 'month6', 'year']);
    });
  });

  describe('parseTimeFilter', () => {
    it('should return null for "all" filter', () => {
      const result = parseTimeFilter('all');
      expect(result).toBeNull();
    });

    it('should parse valid time filters correctly', () => {
      expect(parseTimeFilter('day_within')).toEqual({ period: 'day', mode: 'within' });
      expect(parseTimeFilter('week_older')).toEqual({ period: 'week', mode: 'older' });
      expect(parseTimeFilter('month_within')).toEqual({ period: 'month', mode: 'within' });
      expect(parseTimeFilter('month3_older')).toEqual({ period: 'month3', mode: 'older' });
      expect(parseTimeFilter('month6_within')).toEqual({ period: 'month6', mode: 'within' });
      expect(parseTimeFilter('year_older')).toEqual({ period: 'year', mode: 'older' });
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
        createMockGroup('thread2', now - 5000),
        createMockGroup('thread3', now - 2000),
      ];

      const result = filterChangeGroupsByTime(groups, 'all', now);

      expect(result).toHaveLength(3);
      expect(result[0].threadId).toBe('thread1'); // Most recent
      expect(result[1].threadId).toBe('thread3');
      expect(result[2].threadId).toBe('thread2');
    });

    it('should filter changes within day', () => {
      const oneDayAgo = now - TIME_PERIOD_MS.day;
      const twoDaysAgo = now - TIME_PERIOD_MS.day * 2;

      const groups = [
        createMockGroup('thread1', now - 1000), // Within day
        createMockGroup('thread2', twoDaysAgo), // Older than day
        createMockGroup('thread3', oneDayAgo - 1000), // Just outside day
      ];

      const result = filterChangeGroupsByTime(groups, 'day_within', now);

      expect(result).toHaveLength(1);
      expect(result[0].threadId).toBe('thread1');
    });

    it('should filter changes older than day', () => {
      const oneDayAgo = now - TIME_PERIOD_MS.day;
      const twoDaysAgo = now - TIME_PERIOD_MS.day * 2;

      const groups = [
        createMockGroup('thread1', now - 1000), // Within day
        createMockGroup('thread2', twoDaysAgo), // Older than day
        createMockGroup('thread3', oneDayAgo - 1), // Just outside day (older)
      ];

      const result = filterChangeGroupsByTime(groups, 'day_older', now);

      expect(result).toHaveLength(2); // thread2 and thread3 are both older than day
      expect(result.map((g) => g.threadId)).toContain('thread2');
      expect(result.map((g) => g.threadId)).toContain('thread3');
    });

    it('should filter changes older than week', () => {
      const threeDaysAgo = now - TIME_PERIOD_MS.day * 3;
      const eightDaysAgo = now - TIME_PERIOD_MS.day * 8;
      const tenDaysAgo = now - TIME_PERIOD_MS.day * 10;

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
      const twoWeeksAgo = now - TIME_PERIOD_MS.day * 14;
      const thirtyFiveDaysAgo = now - TIME_PERIOD_MS.day * 35;
      const fortyDaysAgo = now - TIME_PERIOD_MS.day * 40;

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
      const twoMonthsAgo = now - TIME_PERIOD_MS.day * 60;
      const fourMonthsAgo = now - TIME_PERIOD_MS.day * 120;
      const fiveMonthsAgo = now - TIME_PERIOD_MS.day * 150;

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

    it('should filter changes older than 6 months', () => {
      const fourMonthsAgo = now - TIME_PERIOD_MS.day * 120;
      const sevenMonthsAgo = now - TIME_PERIOD_MS.day * 210;
      const eightMonthsAgo = now - TIME_PERIOD_MS.day * 240;

      const groups = [
        createMockGroup('thread1', fourMonthsAgo), // Within 6 months
        createMockGroup('thread2', sevenMonthsAgo), // Older than 6 months
        createMockGroup('thread3', eightMonthsAgo), // Much older than 6 months
      ];

      const result = filterChangeGroupsByTime(groups, 'month6_older', now);

      expect(result).toHaveLength(2); // thread2 and thread3 are older than 6 months
      expect(result.map((g) => g.threadId)).toContain('thread2');
      expect(result.map((g) => g.threadId)).toContain('thread3');
    });

    it('should filter changes older than year', () => {
      const sixMonthsAgo = now - TIME_PERIOD_MS.day * 180;
      const twoYearsAgo = now - TIME_PERIOD_MS.day * 730;
      const threeYearsAgo = now - TIME_PERIOD_MS.day * 1095;

      const groups = [
        createMockGroup('thread1', sixMonthsAgo), // Within year
        createMockGroup('thread2', twoYearsAgo), // Older than year
        createMockGroup('thread3', threeYearsAgo), // Much older than year
      ];

      const result = filterChangeGroupsByTime(groups, 'year_older', now);

      expect(result).toHaveLength(2); // thread2 and thread3 are older than year
      expect(result.map((g) => g.threadId)).toContain('thread2');
      expect(result.map((g) => g.threadId)).toContain('thread3');
    });

    it('should filter changes within week', () => {
      const threeDaysAgo = now - TIME_PERIOD_MS.day * 3;
      const eightDaysAgo = now - TIME_PERIOD_MS.day * 8;

      const groups = [
        createMockGroup('thread1', threeDaysAgo), // Within week
        createMockGroup('thread2', eightDaysAgo), // Older than week
      ];

      const result = filterChangeGroupsByTime(groups, 'week_within', now);

      expect(result).toHaveLength(1);
      expect(result[0].threadId).toBe('thread1');
    });

    it('should filter changes within month', () => {
      const twoWeeksAgo = now - TIME_PERIOD_MS.day * 14;
      const thirtyFiveDaysAgo = now - TIME_PERIOD_MS.day * 35;

      const groups = [
        createMockGroup('thread1', twoWeeksAgo), // Within month
        createMockGroup('thread2', thirtyFiveDaysAgo), // Older than month
      ];

      const result = filterChangeGroupsByTime(groups, 'month_within', now);

      expect(result).toHaveLength(1);
      expect(result[0].threadId).toBe('thread1');
    });

    it('should filter changes within 3 months', () => {
      const twoMonthsAgo = now - TIME_PERIOD_MS.day * 60;
      const fourMonthsAgo = now - TIME_PERIOD_MS.day * 120;

      const groups = [
        createMockGroup('thread1', twoMonthsAgo), // Within 3 months
        createMockGroup('thread2', fourMonthsAgo), // Older than 3 months
      ];

      const result = filterChangeGroupsByTime(groups, 'month3_within', now);

      expect(result).toHaveLength(1);
      expect(result[0].threadId).toBe('thread1');
    });

    it('should filter changes within 6 months', () => {
      const fourMonthsAgo = now - TIME_PERIOD_MS.day * 120;
      const sevenMonthsAgo = now - TIME_PERIOD_MS.day * 210;

      const groups = [
        createMockGroup('thread1', fourMonthsAgo), // Within 6 months
        createMockGroup('thread2', sevenMonthsAgo), // Older than 6 months
      ];

      const result = filterChangeGroupsByTime(groups, 'month6_within', now);

      expect(result).toHaveLength(1);
      expect(result[0].threadId).toBe('thread1');
    });

    it('should filter changes within year', () => {
      const sixMonthsAgo = now - TIME_PERIOD_MS.day * 180;
      const twoYearsAgo = now - TIME_PERIOD_MS.day * 730;

      const groups = [
        createMockGroup('thread1', sixMonthsAgo), // Within year
        createMockGroup('thread2', twoYearsAgo), // Older than year
      ];

      const result = filterChangeGroupsByTime(groups, 'year_within', now);

      expect(result).toHaveLength(1);
      expect(result[0].threadId).toBe('thread1');
    });

    it('should filter out groups with no changes after filtering', () => {
      const oneDayAgo = now - TIME_PERIOD_MS.day;
      const twoDaysAgo = now - TIME_PERIOD_MS.day * 2;

      // Group with changes, all outside time range (older than day)
      const group1: ThreadChangeGroup = {
        threadId: 'thread1',
        thread: {
          id: 'thread1',
          currentTitle: 'Test',
          url: 'https://discord.com/123/thread1',
          parentChannel: 'Test',
          firstSeenAt: oneDayAgo,
        },
        changes: [
          {
            threadId: 'thread1',
            oldTitle: 'Old',
            newTitle: 'New',
            changedAt: twoDaysAgo, // Outside range (> 1 day ago)
            seen: false,
          },
        ],
        latestChangeAt: twoDaysAgo,
        hasUnseen: true,
      };

      // Group with changes, all within time range (< 1 day ago)
      const group2: ThreadChangeGroup = {
        threadId: 'thread2',
        thread: {
          id: 'thread2',
          currentTitle: 'Test',
          url: 'https://discord.com/123/thread2',
          parentChannel: 'Test',
          firstSeenAt: oneDayAgo,
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

      const result = filterChangeGroupsByTime([group1, group2], 'day_within', now);

      expect(result).toHaveLength(1);
      expect(result[0].threadId).toBe('thread2');
    });

    it('should update latestChangeAt and hasUnseen for filtered groups', () => {
      const testNow = 1000000000000;
      const oneDayAgo = testNow - TIME_PERIOD_MS.day;
      const twoDaysAgo = testNow - TIME_PERIOD_MS.day * 2;

      const group: ThreadChangeGroup = {
        threadId: 'thread1',
        thread: {
          id: 'thread1',
          currentTitle: 'Test',
          url: 'https://discord.com/123/thread1',
          parentChannel: 'Test',
          firstSeenAt: oneDayAgo,
        },
        changes: [
          {
            threadId: 'thread1',
            oldTitle: 'Old',
            newTitle: 'New 1',
            changedAt: twoDaysAgo, // Outside range (> 1 day ago)
            seen: true,
          },
          {
            threadId: 'thread1',
            oldTitle: 'New 1',
            newTitle: 'New 2',
            changedAt: testNow - 1000, // Within range (< 1 day ago)
            seen: false,
          },
        ],
        latestChangeAt: testNow - 1000,
        hasUnseen: true,
      };

      const result = filterChangeGroupsByTime([group], 'day_within', testNow);

      expect(result).toHaveLength(1);
      expect(result[0].latestChangeAt).toBe(testNow - 1000);
      expect(result[0].hasUnseen).toBe(true);
      expect(result[0].changes).toHaveLength(1);
      expect(result[0].changes[0].changedAt).toBe(testNow - 1000);
    });

    it('should handle empty groups array', () => {
      const result = filterChangeGroupsByTime([], 'day_within', now);
      expect(result).toEqual([]);
    });

    it('should handle groups with no matching changes', () => {
      const twoDaysAgo = now - TIME_PERIOD_MS.day * 2;
      const groups = [
        createMockGroup('thread1', twoDaysAgo), // Older than day
      ];

      const result = filterChangeGroupsByTime(groups, 'day_within', now);
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

      const result = filterChangeGroupsByTime(groups, 'day_within', now);

      expect(result).toHaveLength(3);
      expect(result[0].threadId).toBe('thread2'); // Most recent
      expect(result[1].threadId).toBe('thread3');
      expect(result[2].threadId).toBe('thread1');
    });
  });
});
