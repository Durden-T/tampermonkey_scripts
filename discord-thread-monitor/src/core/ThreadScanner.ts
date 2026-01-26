import type { MonitoredThread } from '../types';

const THREAD_ELEMENT_SELECTOR = '[data-list-item-id^="channels___"][aria-label*="(thread)"]';
const PARENT_CONTAINER_SELECTOR = 'ul[role="group"][aria-label*="threads"]';

// Discord's thread aria-label format: [unread, ][N mention(s), ]<title> (thread)
// Examples: "unread, 3 mentions, Bug Report (thread)", "Feature Request (thread)"
const TITLE_CLEANUP_PATTERN = /^(unread,\s*)?(\d+\s+mentions?,\s*)?|\s*\(thread\)\s*$/g;

// Discord's parent channel aria-label format: "<channel name> threads"
const CHANNEL_LABEL_CLEANUP_PATTERN = /\s*threads.*$/i;

export class ThreadScanner {
  private cachedRoot: Element | null = null;

  scanVisibleThreads(): MonitoredThread[] {
    const threads: MonitoredThread[] = [];
    const serverId = this.extractServerId();

    if (!serverId) {
      console.warn('Could not extract server ID from URL');
      return threads;
    }

    const appMount = document.querySelector('#app-mount');
    if (appMount && (!this.cachedRoot || this.cachedRoot !== appMount)) {
      this.cachedRoot = appMount;
    }
    const discordRoot = this.cachedRoot ?? document.body;
    const threadElements = discordRoot.querySelectorAll(THREAD_ELEMENT_SELECTOR);

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
    if (!dataListItemId) {
      return null;
    }

    const threadId = dataListItemId.split('___')[1];
    if (!threadId) {
      return null;
    }

    const ariaLabel = element.getAttribute('aria-label');
    if (!ariaLabel) {
      return null;
    }

    const title = ariaLabel.replace(TITLE_CLEANUP_PATTERN, '').trim();
    if (!title) {
      return null;
    }

    const parentChannel = this.extractParentChannel(element);

    return {
      id: threadId,
      currentTitle: title,
      url: `https://discord.com/channels/${serverId}/${threadId}`,
      parentChannel: parentChannel || '',
      firstSeenAt: Date.now(),
    };
  }

  private extractParentChannel(element: HTMLElement): string {
    const container = element.closest(PARENT_CONTAINER_SELECTOR);
    if (!container) {
      return '';
    }

    const label = container.getAttribute('aria-label');
    if (!label) {
      return '';
    }

    const result = label.replace(CHANNEL_LABEL_CLEANUP_PATTERN, '').trim();
    return result;
  }
}
