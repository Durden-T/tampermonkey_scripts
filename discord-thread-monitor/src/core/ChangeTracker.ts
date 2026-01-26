import type { TitleChange, ThreadChangeGroup, MonitoredThread } from '../types';
import { ChangeGroupBuilder } from './ChangeGroupBuilder';
import { TIME_MS } from '../constants';
export class ChangeTracker {
  private changes: TitleChange[];
  private unseenCount: number;
  private unseenThreads: Set<string>;

  constructor(changesRef: TitleChange[]) {
    this.changes = changesRef;
    this.unseenThreads = this.buildUnseenThreadsSet();
    this.unseenCount = this.unseenThreads.size;
  }

  recordChange(change: TitleChange): void {
    this.changes.push(change);
    if (!change.seen && !this.unseenThreads.has(change.threadId)) {
      this.unseenThreads.add(change.threadId);
      this.unseenCount++;
    }
  }

  getChanges(): TitleChange[] {
    return this.changes;
  }

  getUnseenCount(): number {
    return this.unseenCount;
  }

  markSeen(threadId: string): boolean {
    if (!this.unseenThreads.has(threadId)) {
      return false;
    }

    for (const change of this.changes) {
      if (change.threadId === threadId && !change.seen) {
        change.seen = true;
      }
    }

    this.unseenThreads.delete(threadId);
    this.unseenCount--;
    return true;
  }

  markAllSeen(): boolean {
    if (this.unseenCount === 0) {
      return false;
    }
    for (const change of this.changes) {
      change.seen = true;
    }
    this.unseenThreads.clear();
    this.unseenCount = 0;
    return true;
  }

  clear(): void {
    this.changes.length = 0;
    this.unseenThreads.clear();
    this.unseenCount = 0;
  }

  cleanupOldChanges(retentionDays: number): boolean {
    if (retentionDays === 0) {
      return false;
    }

    const retentionMs = retentionDays * TIME_MS.DAY;
    const cutoffTime = Date.now() - retentionMs;
    const originalLength = this.changes.length;

    const remainingUnseenThreads = new Set<string>();

    let writeIndex = 0;
    for (let readIndex = 0; readIndex < this.changes.length; readIndex++) {
      const change = this.changes[readIndex];
      if (change.changedAt >= cutoffTime) {
        if (writeIndex !== readIndex) {
          this.changes[writeIndex] = change;
        }
        writeIndex++;
        if (!change.seen) {
          remainingUnseenThreads.add(change.threadId);
        }
      }
    }
    this.changes.length = writeIndex;

    this.unseenThreads = remainingUnseenThreads;
    this.unseenCount = remainingUnseenThreads.size;

    return this.changes.length !== originalLength;
  }

  processChangesIntoGroups(): {
    unseenCount: number;
    groupMap: Map<string, { changes: TitleChange[]; hasUnseen: boolean; latestChangeAt: number }>;
  } {
    const groupMap = ChangeGroupBuilder.groupByThread(this.changes);
    return { unseenCount: this.unseenCount, groupMap };
  }

  buildChangeGroups(
    groupMap: Map<string, { changes: TitleChange[]; hasUnseen: boolean; latestChangeAt: number }>,
    threads: Record<string, MonitoredThread>
  ): ThreadChangeGroup[] {
    return ChangeGroupBuilder.buildGroups(groupMap, threads);
  }

  private buildUnseenThreadsSet(): Set<string> {
    const unseenThreads = new Set<string>();
    for (const change of this.changes) {
      if (!change.seen) {
        unseenThreads.add(change.threadId);
      }
    }
    return unseenThreads;
  }
}
