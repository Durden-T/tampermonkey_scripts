import type { MonitoredThread, TitleChange } from '../types';

export interface IThreadRepository {
  getThreads(): Record<string, MonitoredThread>;
  addThread(thread: MonitoredThread): void;
  recordTitleChange(change: TitleChange, newTitle: string): void;
  addThreads(threads: MonitoredThread[]): void;
  recordTitleChanges(changes: Array<{ change: TitleChange; newTitle: string }>): void;
}
