import {
  type MonitoredThread,
  type TitleChange,
  type StoredData,
  type ThreadChangeGroup,
  type StorageInfo,
  DEFAULT_RETENTION_DAYS,
} from '../types';
import { StorageEngine } from './StorageEngine';
import { ChangeTracker } from './ChangeTracker';
import { BlacklistManager } from './BlacklistManager';
import type { IThreadRepository } from './IThreadRepository';

export class ThreadStore implements IThreadRepository {
  private data: StoredData;
  private storageEngine: StorageEngine;
  private changeTracker: ChangeTracker;
  private blacklistManager: BlacklistManager;
  private cachedThreads: Record<string, MonitoredThread> | null = null;
  private cachedDashboardData: {
    unseenCount: number;
    changeGroups: ThreadChangeGroup[];
    storageInfo: StorageInfo;
  } | null = null;

  constructor() {
    this.storageEngine = new StorageEngine();
    this.data = this.storageEngine.loadData();
    this.changeTracker = new ChangeTracker(this.data.changes);
    this.blacklistManager = new BlacklistManager(this.data.blacklist);
    this.cleanupOldChanges();
  }

  private invalidateThreadsCache(): void {
    this.cachedThreads = null;
  }

  private invalidateDashboardCache(): void {
    this.cachedDashboardData = null;
  }

  private invalidateAllCaches(): void {
    this.cachedThreads = null;
    this.cachedDashboardData = null;
  }

  private scheduleSave(immediate: boolean = false): void {
    this.storageEngine.scheduleSave(this.data, immediate);
  }

  getStorageInfo(): StorageInfo {
    return this.storageEngine.getStorageInfo(
      this.changeTracker.getChanges().length,
      Object.keys(this.data.threads).length
    );
  }

  getDashboardData(): {
    unseenCount: number;
    changeGroups: ThreadChangeGroup[];
    storageInfo: StorageInfo;
  } {
    if (this.cachedDashboardData !== null) {
      return this.cachedDashboardData;
    }

    const { unseenCount, groupMap } = this.changeTracker.processChangesIntoGroups();
    const changeGroups = this.changeTracker.buildChangeGroups(groupMap, this.data.threads);

    this.cachedDashboardData = {
      unseenCount,
      changeGroups,
      storageInfo: this.getStorageInfo(),
    };

    return this.cachedDashboardData;
  }

  addThread(thread: MonitoredThread): void {
    if (!this.blacklistManager.has(thread.id)) {
      this.data.threads[thread.id] = thread;
      this.invalidateThreadsCache();
      this.scheduleSave();
    }
  }

  updateTitle(threadId: string, newTitle: string): void {
    const thread = this.data.threads[threadId];
    if (thread && thread.currentTitle !== newTitle) {
      thread.currentTitle = newTitle;
      this.invalidateThreadsCache();
      this.scheduleSave();
    }
  }

  getThreads(): Record<string, MonitoredThread> {
    if (this.cachedThreads !== null) {
      return this.cachedThreads;
    }

    const filtered: Record<string, MonitoredThread> = {};
    for (const [id, thread] of Object.entries(this.data.threads)) {
      if (!this.blacklistManager.has(id)) {
        filtered[id] = thread;
      }
    }
    this.cachedThreads = filtered;
    return filtered;
  }

  getThread(threadId: string): MonitoredThread | undefined {
    return this.data.threads[threadId];
  }

  recordTitleChange(change: TitleChange, newTitle: string): void {
    this.changeTracker.recordChange(change);
    const thread = this.data.threads[change.threadId];
    if (thread) {
      thread.currentTitle = newTitle;
      this.invalidateDashboardCache();
    }
    this.scheduleSave();
  }

  getChanges(): TitleChange[] {
    return [...this.changeTracker.getChanges()];
  }

  getChangesGroupedByThread(): ThreadChangeGroup[] {
    const { groupMap } = this.changeTracker.processChangesIntoGroups();
    return this.changeTracker.buildChangeGroups(groupMap, this.data.threads);
  }

  getUnseenChangesCount(): number {
    return this.changeTracker.getUnseenCount();
  }

  markChangeSeen(threadId: string): void {
    if (this.changeTracker.markSeen(threadId)) {
      this.invalidateDashboardCache();
      this.scheduleSave();
    }
  }

  markAllChangesSeen(): void {
    if (this.changeTracker.markAllSeen()) {
      this.invalidateDashboardCache();
      this.scheduleSave();
    }
  }

  clearChanges(): void {
    this.changeTracker.clear();
    this.invalidateDashboardCache();
    this.scheduleSave(true);
  }

  addToBlacklist(threadId: string): void {
    if (this.blacklistManager.add(threadId)) {
      this.data.blacklist = this.blacklistManager.getAll();
      this.invalidateAllCaches();
      this.scheduleSave();
    }
  }

  removeFromBlacklist(threadId: string): void {
    if (this.blacklistManager.remove(threadId)) {
      this.data.blacklist = this.blacklistManager.getAll();
      this.invalidateAllCaches();
      this.scheduleSave();
    }
  }

  getBlacklist(): string[] {
    return this.blacklistManager.getAll();
  }

  isBlacklisted(threadId: string): boolean {
    return this.blacklistManager.has(threadId);
  }

  getBlacklistedThreads(): MonitoredThread[] {
    const result: MonitoredThread[] = [];
    for (const id of this.blacklistManager.getAll()) {
      const thread = this.data.threads[id];
      if (thread) {
        result.push(thread);
      }
    }
    return result;
  }

  getRetentionDays(): number {
    return this.data.retentionDays ?? DEFAULT_RETENTION_DAYS;
  }

  setRetentionDays(days: number): void {
    const newDays = days === 0 ? 0 : Math.max(1, days);
    const currentDays = this.getRetentionDays();
    const needsCleanup = newDays < currentDays || (newDays > 0 && currentDays === 0);
    this.data.retentionDays = newDays;

    if (needsCleanup) {
      const cleanupPerformed = this.changeTracker.cleanupOldChanges(newDays);
      if (cleanupPerformed) {
        this.invalidateDashboardCache();
      }
    }
    this.scheduleSave(true);
  }

  private cleanupOldChanges(): void {
    const retentionDays = this.getRetentionDays();
    const cleanupPerformed = this.changeTracker.cleanupOldChanges(retentionDays);
    if (cleanupPerformed) {
      this.invalidateDashboardCache();
      this.scheduleSave(true);
    }
  }
}
