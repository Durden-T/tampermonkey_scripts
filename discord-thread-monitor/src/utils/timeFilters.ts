import type { ThreadChangeGroup } from '../types';
import { TIME_MS, TIME_UNITS } from '../constants';

export type TimePeriod = 'week' | 'month' | 'month3';
export type TimeFilterMode = 'within' | 'older';
export type TimeFilter = 'all' | 'allUnread' | `${TimePeriod}_${TimeFilterMode}`;

const DAYS_PER_WEEK = 7;

export const TIME_PERIOD_MS: Record<TimePeriod, number> = {
  week: DAYS_PER_WEEK * TIME_MS.DAY,
  month: TIME_UNITS.DAYS_PER_MONTH * TIME_MS.DAY,
  month3: TIME_UNITS.DAYS_PER_MONTH * TIME_UNITS.MONTHS_IN_QUARTER * TIME_MS.DAY,
};

export const TIME_PERIODS: TimePeriod[] = ['week', 'month', 'month3'];

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

  if (filter === 'allUnread') {
    return groups.filter((group) => group.hasUnseen);
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
