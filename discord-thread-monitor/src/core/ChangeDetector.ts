import type { MonitoredThread, TitleChange } from '../types';
import type { ThreadStore } from './ThreadStore';

export class ChangeDetector {
  constructor(private store: ThreadStore) {}

  detectAndPersistChanges(currentThreads: MonitoredThread[]): TitleChange[] {
    const changes: TitleChange[] = [];
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
          this.store.recordTitleChange(change, currentThread.currentTitle);
        }
      } else {
        this.store.addThread(currentThread);
      }
    }

    return changes;
  }
}
