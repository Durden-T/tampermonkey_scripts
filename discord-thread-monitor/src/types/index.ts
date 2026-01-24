export interface MonitoredThread {
  id: string;
  currentTitle: string;
  url: string;
  parentChannel: string;
  firstSeenAt: number;
}

export interface TitleChange {
  threadId: string;
  oldTitle: string;
  newTitle: string;
  changedAt: number;
  seen: boolean;
}

export interface ThreadChangeGroup {
  threadId: string;
  thread: MonitoredThread | undefined;
  changes: TitleChange[];
  latestChangeAt: number;
  hasUnseen: boolean;
}

export interface StoredData {
  threads: Record<string, MonitoredThread>;
  changes: TitleChange[];
  blacklist: string[];
  retentionDays?: number;
}

export interface StorageInfo {
  rawSize: number;
  compressedSize: number;
  isCompressed: boolean;
  changeCount: number;
  threadCount: number;
}

export const DEFAULT_RETENTION_DAYS = 0;
export const COMPRESSION_THRESHOLD_BYTES = 50 * 1024;
export const STORAGE_WARNING_BYTES = 200 * 1024;
