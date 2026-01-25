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
      const existing = groupMap.get(change.threadId);
      if (existing) {
        existing.changes.push(change);
        if (!change.seen) {
          existing.hasUnseen = true;
        }
        if (change.changedAt > existing.latestChangeAt) {
          existing.latestChangeAt = change.changedAt;
        }
      } else {
        groupMap.set(change.threadId, {
          changes: [change],
          hasUnseen: !change.seen,
          latestChangeAt: change.changedAt,
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
