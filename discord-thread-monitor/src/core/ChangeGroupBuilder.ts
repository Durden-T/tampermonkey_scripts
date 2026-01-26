import type { TitleChange, ThreadChangeGroup, MonitoredThread } from '../types';

export class ChangeGroupBuilder {
  static groupByThread(
    changes: TitleChange[]
  ): Map<string, { changes: TitleChange[]; hasUnseen: boolean; latestChangeAt: number }> {
    const groupMap = new Map<
      string,
      { changes: TitleChange[]; hasUnseen: boolean; latestChangeAt: number }
    >();

    for (const change of changes) {
      const { threadId, seen, changedAt } = change;
      const existing = groupMap.get(threadId);
      if (existing) {
        existing.changes.push(change);
        if (!seen) {
          existing.hasUnseen = true;
        }
        if (changedAt > existing.latestChangeAt) {
          existing.latestChangeAt = changedAt;
        }
      } else {
        groupMap.set(threadId, {
          changes: [change],
          hasUnseen: !seen,
          latestChangeAt: changedAt,
        });
      }
    }

    return groupMap;
  }

  static buildGroups(
    groupMap: Map<string, { changes: TitleChange[]; hasUnseen: boolean; latestChangeAt: number }>,
    threads: Record<string, MonitoredThread>
  ): ThreadChangeGroup[] {
    return Array.from(groupMap.entries())
      .map(([threadId, groupData]) => ({
        threadId,
        thread: threads[threadId],
        changes: groupData.changes.sort((a, b) => b.changedAt - a.changedAt),
        latestChangeAt: groupData.latestChangeAt,
        hasUnseen: groupData.hasUnseen,
      }))
      .sort((a, b) => b.latestChangeAt - a.latestChangeAt);
  }
}
