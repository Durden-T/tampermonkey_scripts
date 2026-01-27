import {
  type MonitoredThread,
  type TitleChange,
  type StoredData,
  type ThreadChangeGroup,
  type StorageInfo,
  DEFAULT_RETENTION_DAYS,
} from '../types';
import { RETENTION, STORAGE } from '../constants';
import { StorageEngine } from './StorageEngine';
import { ChangeTracker } from './ChangeTracker';
import { BlacklistManager } from './BlacklistManager';
import type { IThreadRepository } from './IThreadRepository';
import { openAppDB, type AppDB } from './db';
import { initPrefsStore, getPrefsStore } from './PrefsStore';
import { setLanguage } from '../i18n';

export class ThreadStore implements IThreadRepository {
  private data: StoredData;
  private storageEngine: StorageEngine;
  private changeTracker: ChangeTracker;
  private blacklistManager: BlacklistManager;
  private db: AppDB;
  private cachedThreads: Record<string, MonitoredThread> | null = null;
  private cachedDashboardData: {
    unseenCount: number;
    changeGroups: ThreadChangeGroup[];
    storageInfo: StorageInfo;
  } | null = null;
  private cachedChanges: TitleChange[] | null = null;
  private cachedBlacklistedThreads: MonitoredThread[] | null = null;

  private constructor(storageEngine: StorageEngine, data: StoredData, db: AppDB) {
    this.storageEngine = storageEngine;
    this.data = data;
    this.db = db;
    this.changeTracker = new ChangeTracker(this.data.changes);
    this.blacklistManager = new BlacklistManager(this.data.blacklist);
    this.cleanupOldChanges();
  }

  static async create(): Promise<ThreadStore> {
    const db = await openAppDB();
    try {
      const engine = StorageEngine.fromDB(db);
      const data = await engine.loadData();
      await initPrefsStore(db);

      const savedLang = getPrefsStore().get<'zh' | 'en'>(STORAGE.LANGUAGE_KEY);
      if (savedLang) {
        setLanguage(savedLang);
      }

      return new ThreadStore(engine, data, db);
    } catch (error) {
      db.close();
      throw error;
    }
  }

  private invalidateDashboardCache(): void {
    this.cachedDashboardData = null;
    this.cachedChanges = null;
  }

  private invalidateAllCaches(): void {
    this.cachedThreads = null;
    this.cachedDashboardData = null;
    this.cachedChanges = null;
    this.cachedBlacklistedThreads = null;
  }

  private scheduleSave(immediate: boolean = false): void {
    this.storageEngine.scheduleSave(this.data, immediate);
  }

  private persistMutation(
    options: { invalidateAllCaches?: boolean; immediate?: boolean } = {}
  ): void {
    const { invalidateAllCaches = false, immediate = false } = options;

    if (invalidateAllCaches) {
      this.invalidateAllCaches();
    } else {
      this.invalidateDashboardCache();
    }

    this.scheduleSave(immediate);
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
      this.persistMutation({ invalidateAllCaches: true });
    }
  }

  addThreads(threads: MonitoredThread[]): void {
    if (threads.length === 0) {
      return;
    }

    let hasChanges = false;
    for (const thread of threads) {
      if (!this.blacklistManager.has(thread.id)) {
        this.data.threads[thread.id] = thread;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.persistMutation({ invalidateAllCaches: true });
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
    }
    this.persistMutation({ invalidateAllCaches: true });
  }

  recordTitleChanges(changes: Array<{ change: TitleChange; newTitle: string }>): void {
    if (changes.length === 0) {
      return;
    }

    let hasChanges = false;
    for (const { change, newTitle } of changes) {
      const thread = this.data.threads[change.threadId];
      if (!thread) {
        console.warn(
          `[ThreadStore] Skipping title change for non-existent thread: ${change.threadId}`
        );
        continue;
      }

      this.changeTracker.recordChange(change);
      thread.currentTitle = newTitle;
      hasChanges = true;
    }

    if (hasChanges) {
      this.persistMutation({ invalidateAllCaches: true });
    }
  }

  getChanges(): TitleChange[] {
    if (this.cachedChanges !== null) {
      return this.cachedChanges;
    }

    this.cachedChanges = [...this.changeTracker.getChanges()];
    return this.cachedChanges;
  }

  getChangesGroupedByThread(): ThreadChangeGroup[] {
    return this.getDashboardData().changeGroups;
  }

  getUnseenChangesCount(): number {
    return this.changeTracker.getUnseenCount();
  }

  markChangeSeen(threadId: string): void {
    if (this.changeTracker.markSeen(threadId)) {
      this.persistMutation();
    }
  }

  markAllChangesSeen(): void {
    if (this.changeTracker.markAllSeen()) {
      this.persistMutation();
    }
  }

  clearChanges(): void {
    this.changeTracker.clear();
    this.persistMutation({ immediate: true });
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
      this.cachedThreads = null;
      this.cachedBlacklistedThreads = null;
      const hasChanges = this.changeTracker.getChanges().some((c) => c.threadId === threadId);
      if (hasChanges) {
        this.invalidateDashboardCache();
      }
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
    if (this.cachedBlacklistedThreads !== null) {
      return this.cachedBlacklistedThreads;
    }

    const result: MonitoredThread[] = [];
    for (const id of this.blacklistManager.getAll()) {
      const thread = this.data.threads[id];
      if (thread) {
        result.push(thread);
      }
    }
    this.cachedBlacklistedThreads = result;
    return result;
  }

  getRetentionDays(): number {
    return this.data.retentionDays ?? DEFAULT_RETENTION_DAYS;
  }

  setRetentionDays(days: number): void {
    if (!Number.isFinite(days) || days < 0) {
      throw new Error('Retention days must be a finite non-negative number');
    }

    const clampedDays =
      days === 0 ? 0 : Math.min(Math.max(1, Math.floor(days)), RETENTION.MAX_DAYS);
    const currentDays = this.getRetentionDays();
    const needsCleanup = clampedDays < currentDays || (clampedDays > 0 && currentDays === 0);
    this.data.retentionDays = clampedDays;

    if (needsCleanup && this.changeTracker.cleanupOldChanges(clampedDays)) {
      this.invalidateDashboardCache();
    }
    this.scheduleSave(true);
  }

  async flush(): Promise<void> {
    await this.storageEngine.flushPendingSave();
  }

  close(): void {
    this.db.close();
  }

  private cleanupOldChanges(): void {
    const retentionDays = this.getRetentionDays();
    if (this.changeTracker.cleanupOldChanges(retentionDays)) {
      this.persistMutation({ immediate: true });
    }
  }
}
