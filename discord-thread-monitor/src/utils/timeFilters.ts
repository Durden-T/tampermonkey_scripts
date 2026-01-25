import type { ThreadChangeGroup } from '../types';

export type TimePeriod = 'day' | 'week' | 'month' | 'month3' | 'month6' | 'year';
export type TimeFilterMode = 'within' | 'older';
export type TimeFilter = 'all' | `${TimePeriod}_${TimeFilterMode}`;

export const TIME_PERIOD_MS: Record<TimePeriod, number> = {
  day: 86400000,
  week: 604800000,
  month: 2592000000,
  month3: 7776000000,
  month6: 15552000000,
  year: 31536000000,
};

export const TIME_PERIODS: TimePeriod[] = ['day', 'week', 'month', 'month3', 'month6', 'year'];

export function parseTimeFilter(
  filter: TimeFilter
): { period: TimePeriod; mode: TimeFilterMode } | null {
  if (filter === 'all') return null;
  const [period, mode] = filter.split('_') as [TimePeriod, TimeFilterMode];
  return { period, mode };
}

export function filterChangeGroupsByTime(
  groups: ThreadChangeGroup[],
  filter: TimeFilter,
  now: number
): ThreadChangeGroup[] {
  if (filter === 'all') {
    return [...groups].sort((a, b) => b.latestChangeAt - a.latestChangeAt);
  }

  const parsed = parseTimeFilter(filter);
  if (!parsed) {
    return [...groups].sort((a, b) => b.latestChangeAt - a.latestChangeAt);
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
