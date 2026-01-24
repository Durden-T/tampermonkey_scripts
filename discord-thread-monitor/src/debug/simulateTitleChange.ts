import type { ThreadStore } from '../core/ThreadStore';
import type { Notifier } from '../core/Notifier';
import type { TitleChange, MonitoredThread } from '../types';

const TEST_TITLES = [
  'Looking for Group - Weekly Raid',
  'Bug Report: Login Issues',
  'Feature Request: Dark Mode',
  'Community Event - Saturday',
  'Help Needed: Database Query',
  'Discussion: Best Practices',
  'Announcement: Server Maintenance',
  'Tutorial: Getting Started Guide',
];

export function simulateTitleChange(
  store: ThreadStore,
  notifier: Notifier,
  refreshData: () => void
): void {
  const threads = Object.values(store.getThreads());

  if (threads.length === 0) {
    const randomTitle = TEST_TITLES[Math.floor(Math.random() * TEST_TITLES.length)];
    const fakeThread: MonitoredThread = {
      id: `debug-${Date.now()}`,
      currentTitle: randomTitle,
      url: 'https://discord.com',
      parentChannel: 'Test Channel',
      firstSeenAt: Date.now(),
    };
    store.addThread(fakeThread);

    const newTitle = TEST_TITLES[Math.floor(Math.random() * TEST_TITLES.length)];
    const change: TitleChange = {
      threadId: fakeThread.id,
      oldTitle: fakeThread.currentTitle,
      newTitle,
      changedAt: Date.now(),
      seen: false,
    };

    store.recordTitleChange(change, newTitle);
    notifier.notifyAll([change]);
    refreshData();
    return;
  }

  const randomThread = threads[Math.floor(Math.random() * threads.length)];
  const newTitle = TEST_TITLES[Math.floor(Math.random() * TEST_TITLES.length)];

  const change: TitleChange = {
    threadId: randomThread.id,
    oldTitle: randomThread.currentTitle,
    newTitle,
    changedAt: Date.now(),
    seen: false,
  };

  store.recordTitleChange(change, newTitle);
  notifier.notifyAll([change]);
  refreshData();
}
