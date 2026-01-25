import type { ThreadChangeGroup } from '../types';
import { TIME_MS, TIME_UNITS } from '../constants';

export type TimePeriod = 'day' | 'week' | 'month' | 'month3' | 'month6' | 'year';
export type TimeFilterMode = 'within' | 'older';
export type TimeFilter = 'all' | `${TimePeriod}_${TimeFilterMode}`;

const DAYS_PER_WEEK = 7;
const DAYS_PER_YEAR = 365;

export const TIME_PERIOD_MS: Record<TimePeriod, number> = {
  day: TIME_MS.DAY,
  week: DAYS_PER_WEEK * TIME_MS.DAY,
  month: TIME_UNITS.DAYS_PER_MONTH * TIME_MS.DAY,
  month3: TIME_UNITS.DAYS_PER_MONTH * TIME_UNITS.MONTHS_IN_QUARTER * TIME_MS.DAY,
  month6: TIME_UNITS.DAYS_PER_MONTH * TIME_UNITS.MONTHS_IN_HALF_YEAR * TIME_MS.DAY,
  year: DAYS_PER_YEAR * TIME_MS.DAY,
};

export const TIME_PERIODS: TimePeriod[] = ['day', 'week', 'month', 'month3', 'month6', 'year'];

export function parseTimeFilter(
  filter: TimeFilter
): { period: TimePeriod; mode: TimeFilterMode } | null {
  if (filter === 'all') {
    return null;
  }
  const [period, mode] = filter.split('_') as [TimePeriod, TimeFilterMode];
  return { period, mode };
}

export function filterChangeGroupsByTime(
  groups: ThreadChangeGroup[],
  filter: TimeFilter,
  now: number
): ThreadChangeGroup[] {
  if (filter === 'all') {
    return groups;
  }

  const parsed = parseTimeFilter(filter);
  if (!parsed) {
    return groups;
  }

  const { period, mode } = parsed;
  const cutoffTime = now - TIME_PERIOD_MS[period];
  const isWithin = mode === 'within';

  const result: ThreadChangeGroup[] = [];

  for (const group of groups) {
    const filteredChanges = group.changes.filter((c) =>
      isWithin ? c.changedAt > cutoffTime : c.changedAt <= cutoffTime
    );

    if (filteredChanges.length > 0) {
      result.push({
        ...group,
        changes: filteredChanges,
        latestChangeAt: filteredChanges[0].changedAt,
        hasUnseen: filteredChanges.some((c) => !c.seen),
      });
    }
  }

  return result.sort((a, b) => b.latestChangeAt - a.latestChangeAt);
}
