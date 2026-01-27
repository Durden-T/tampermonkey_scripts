import type { MonitoredThread, TitleChange } from '../types';
import type { IThreadRepository } from './IThreadRepository';

export class ChangeDetector {
  constructor(private store: IThreadRepository) {}

  detectAndPersistChanges(currentThreads: MonitoredThread[]): TitleChange[] {
    const changes: TitleChange[] = [];
    const titleChanges: Array<{ change: TitleChange; newTitle: string }> = [];
    const newThreads: MonitoredThread[] = [];
    const storedThreads = this.store.getThreads();

    for (const currentThread of currentThreads) {
      const storedThread = storedThreads[currentThread.id];

      if (storedThread) {
        if (storedThread.currentTitle !== currentThread.currentTitle) {
          const change: TitleChange = {
            threadId: currentThread.id,
            oldTitle: storedThread.currentTitle,
            newTitle: currentThread.currentTitle,
            changedAt: Date.now(),
            seen: false,
          };
          changes.push(change);
          titleChanges.push({ change, newTitle: currentThread.currentTitle });
        }
      } else {
        newThreads.push(currentThread);
      }
    }

    this.store.addThreads(newThreads);
    this.store.recordTitleChanges(titleChanges);

    return changes;
  }
}
