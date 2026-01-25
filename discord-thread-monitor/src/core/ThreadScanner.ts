import type { MonitoredThread } from '../types';

export class ThreadScanner {
  scanVisibleThreads(): MonitoredThread[] {
    const threads: MonitoredThread[] = [];
    const serverId = this.extractServerId();

    if (!serverId) {
      console.warn('Could not extract server ID from URL');
      return threads;
    }

    const threadElements = document.querySelectorAll(
      '[data-list-item-id^="channels___"][aria-label*="(thread)"]'
    );

    threadElements.forEach((element) => {
      const thread = this.parseThreadElement(element as HTMLElement, serverId);
      if (thread) {
        threads.push(thread);
      }
    });

    return threads;
  }

  private extractServerId(): string | null {
    const pathParts = window.location.pathname.split('/');
    return pathParts[2] || null;
  }

  private parseThreadElement(element: HTMLElement, serverId: string): MonitoredThread | null {
    const dataListItemId = element.getAttribute('data-list-item-id');
    if (!dataListItemId) return null;

    const threadId = dataListItemId.split('___')[1];
    if (!threadId) return null;

    const ariaLabel = element.getAttribute('aria-label') || '';
    const title = ariaLabel
      .replace(/^unread,\s*/, '')
      .replace(/\s*\(thread\)\s*$/, '')
      .trim();

    if (!title) return null;

    const url = `https://discord.com/channels/${serverId}/${threadId}`;

    const parentChannel = this.extractParentChannel(element);

    return {
      id: threadId,
      currentTitle: title,
      url,
      parentChannel: parentChannel || '',
      firstSeenAt: Date.now(),
    };
  }

  private extractParentChannel(element: HTMLElement): string {
    const container = element.closest('ul[role="group"][aria-label*="threads"]');
    if (container) {
      const label = container.getAttribute('aria-label');
      if (label) {
        return label.replace(/\s*threads.*$/i, '').trim();
      }
    }
    return '';
  }
}
