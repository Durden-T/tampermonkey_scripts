import type { ThreadStore } from '../core/ThreadStore';
import type { Notifier } from '../core/Notifier';
import type { TitleChange, MonitoredThread } from '../types';

const TEST_TITLES = [
  'Community Event - Saturday',
  'Announcement: Server Maintenance',
  'Tutorial: Getting Started Guide',
];

const createFakeThread = (): MonitoredThread => {
  const randomTitle = TEST_TITLES[Math.floor(Math.random() * TEST_TITLES.length)];
  return {
    id: `debug-${Date.now()}`,
    currentTitle: randomTitle,
    url: 'https://discord.com',
    parentChannel: 'Test Channel',
    firstSeenAt: Date.now(),
  };
};

const createTitleChange = (threadId: string, oldTitle: string): TitleChange => {
  const newTitle = TEST_TITLES[Math.floor(Math.random() * TEST_TITLES.length)];
  return {
    threadId,
    oldTitle,
    newTitle,
    changedAt: Date.now(),
    seen: false,
  };
};

const applyTitleChange = (
  store: ThreadStore,
  notifier: Notifier,
  refreshData: () => void,
  change: TitleChange
): void => {
  store.recordTitleChange(change, change.newTitle);
  notifier.notifyAll([change]);
  refreshData();
};

export function simulateTitleChange(
  store: ThreadStore,
  notifier: Notifier,
  refreshData: () => void
): void {
  const threads = Object.values(store.getThreads());

  if (threads.length === 0) {
    const fakeThread = createFakeThread();
    store.addThread(fakeThread);

    const change = createTitleChange(fakeThread.id, fakeThread.currentTitle);
    applyTitleChange(store, notifier, refreshData, change);
    return;
  }

  const randomThread = threads[Math.floor(Math.random() * threads.length)];
  const change = createTitleChange(randomThread.id, randomThread.currentTitle);
  applyTitleChange(store, notifier, refreshData, change);
}
