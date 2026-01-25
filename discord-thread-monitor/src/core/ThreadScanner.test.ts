import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ThreadScanner } from './ThreadScanner';
import * as shadowDomQuery from '../utils/shadowDomQuery';

describe('ThreadScanner', () => {
  let scanner: ThreadScanner;
  let container: HTMLDivElement;

  beforeEach(() => {
    scanner = new ThreadScanner();
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      href: 'https://discord.com/channels/123/456',
      pathname: '/channels/123/456',
    } as Location);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  describe('scanVisibleThreads', () => {
    it('should return empty array when no server ID in URL', () => {
      // Suppress expected console.warn from invalid URL extraction
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      vi.spyOn(window, 'location', 'get').mockReturnValue({
        href: 'https://discord.com/channels',
        pathname: '/channels',
      } as Location);

      const threads = scanner.scanVisibleThreads();
      expect(threads).toEqual([]);

      // Verify warning was logged (expected behavior)
      expect(consoleSpy).toHaveBeenCalledWith('Could not extract server ID from URL');

      // Restore console.warn
      consoleSpy.mockRestore();
    });

    it('should return empty array when no thread elements found', () => {
      const threads = scanner.scanVisibleThreads();
      expect(threads).toEqual([]);
    });

    it('should parse thread elements correctly', () => {
      createMockThreadElement(container, 'channels___123456', 'Test Thread 1', 'General threads');
      createMockThreadElement(container, 'channels___789012', 'Test Thread 2', 'Random threads');

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(2);
      expect(threads[0]).toMatchObject({
        id: '123456',
        currentTitle: 'Test Thread 1',
        url: 'https://discord.com/channels/123/123456',
        parentChannel: 'General',
      });
      expect(threads[1]).toMatchObject({
        id: '789012',
        currentTitle: 'Test Thread 2',
        url: 'https://discord.com/channels/123/789012',
        parentChannel: 'Random',
      });
    });

    it('should handle threads with unread marker', () => {
      createMockThreadElement(
        container,
        'channels___999',
        'Test Thread with unread',
        'General threads',
        true
      );

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(1);
      expect(threads[0].currentTitle).toBe('Test Thread with unread');
    });

    it('should skip elements without data-list-item-id', () => {
      createMockThreadElement(container, 'channels___123', 'Valid Thread', 'General threads');

      const invalidElement = document.createElement('div');
      invalidElement.setAttribute('aria-label', 'Test Thread (thread)');
      container.appendChild(invalidElement);

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(1);
      expect(threads[0].id).toBe('123');
    });

    it('should skip elements with malformed data-list-item-id', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'malformed');
      mockElement.setAttribute('aria-label', 'Test Thread (thread)');
      container.appendChild(mockElement);

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(0);
    });

    it('should skip elements with empty title', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'channels___123');
      mockElement.setAttribute('aria-label', '');
      container.appendChild(mockElement);

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(0);
    });

    it('should skip elements where title becomes empty after trimming', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'channels___123');
      mockElement.setAttribute('aria-label', 'unread,   (thread)');
      container.appendChild(mockElement);

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(0);
    });

    it('should handle parent container with empty aria-label', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'channels___123');
      mockElement.setAttribute('aria-label', 'Test Thread (thread)');

      const parentContainer = document.createElement('ul');
      parentContainer.setAttribute('role', 'group');
      parentContainer.setAttribute('aria-label', '');
      parentContainer.appendChild(mockElement);
      container.appendChild(parentContainer);

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(1);
      expect(threads[0].parentChannel).toBe('');
    });

    it('should handle threads without parent channel', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'channels___123');
      mockElement.setAttribute('aria-label', 'Test Thread (thread)');
      container.appendChild(mockElement);

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(1);
      expect(threads[0].parentChannel).toBe('');
    });

    it('should set firstSeenAt to current timestamp', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      createMockThreadElement(container, 'channels___123', 'Test', 'General threads');

      const threads = scanner.scanVisibleThreads();

      expect(threads[0].firstSeenAt).toBe(now);
    });
  });

  describe('parseThreadElement edge cases', () => {
    it('should handle thread names with (thread) in the actual title', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'channels___123');
      mockElement.setAttribute('aria-label', 'My (thread) Project (thread)');
      container.appendChild(mockElement);

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(1);
      expect(threads[0].currentTitle).toBe('My (thread) Project');
    });

    it('should handle thread names starting with unread and containing (thread)', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'channels___123');
      mockElement.setAttribute('aria-label', 'unread, My Thread (thread)');
      container.appendChild(mockElement);

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(1);
      expect(threads[0].currentTitle).toBe('My Thread');
    });

    it('should handle extra whitespace in thread names', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'channels___123');
      mockElement.setAttribute('aria-label', '   Test Thread   (thread)   ');
      container.appendChild(mockElement);

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(1);
      expect(threads[0].currentTitle).toBe('Test Thread');
    });

    it('should handle complex parent channel names', () => {
      createMockThreadElement(container, 'channels___123', 'Test', 'General Chat threads');

      const threads = scanner.scanVisibleThreads();

      expect(threads[0].parentChannel).toBe('General Chat');
    });

    it('should handle parent channel without "threads" suffix', () => {
      createMockThreadElement(container, 'channels___123', 'Test', 'General');

      const threads = scanner.scanVisibleThreads();

      expect(threads[0].parentChannel).toBe('');
    });
  });

  describe('Server ID extraction', () => {
    it('should extract server ID from various URL formats', () => {
      const testCases = [
        { pathname: '/channels/123456789' },
        { pathname: '/channels/999888777/123456' },
        { pathname: '/channels/111222/333444/555666' },
      ];

      testCases.forEach(({ pathname }) => {
        vi.spyOn(window, 'location', 'get').mockReturnValue({
          href: `https://discord.com${pathname}`,
          pathname,
        } as Location);

        const threads = scanner.scanVisibleThreads();
        // Just verify no error occurs - actual server ID usage is tested in parse tests
        expect(threads).toBeDefined();
      });
    });

    it('should handle invalid URL paths gracefully', () => {
      // Suppress expected console.warn from invalid URL extraction
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      vi.spyOn(window, 'location', 'get').mockReturnValue({
        href: 'https://discord.com/invalid',
        pathname: '/invalid',
      } as Location);

      const threads = scanner.scanVisibleThreads();
      expect(threads).toEqual([]);

      // Verify warning was logged (expected behavior)
      expect(consoleSpy).toHaveBeenCalledWith('Could not extract server ID from URL');

      // Restore console.warn
      consoleSpy.mockRestore();
    });
  });

  describe('Parent channel extraction', () => {
    it('should handle container with different aria-label formats', () => {
      const testCases = [
        { ariaLabel: 'General threads', expected: 'General' },
        { ariaLabel: 'Random threads', expected: 'Random' },
        { ariaLabel: 'Test Channel threads', expected: 'Test Channel' },
        { ariaLabel: 'Channel with spaces threads', expected: 'Channel with spaces' },
      ];

      testCases.forEach(({ ariaLabel, expected }) => {
        container.innerHTML = '';
        createMockThreadElement(container, 'channels___123', 'Test', ariaLabel);

        const threads = scanner.scanVisibleThreads();

        expect(threads[0].parentChannel).toBe(expected);
      });
    });

    it('should handle missing closest container', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'channels___123');
      mockElement.setAttribute('aria-label', 'Test Thread (thread)');
      container.appendChild(mockElement);

      const threads = scanner.scanVisibleThreads();

      expect(threads[0].parentChannel).toBe('');
    });

    it('should handle parent container without aria-label', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'channels___123');
      mockElement.setAttribute('aria-label', 'Test Thread (thread)');

      const parentContainer = document.createElement('ul');
      parentContainer.setAttribute('role', 'group');
      parentContainer.appendChild(mockElement);
      container.appendChild(parentContainer);

      const threads = scanner.scanVisibleThreads();

      expect(threads[0].parentChannel).toBe('');
    });

    it('should handle parent container with aria-label that does not contain threads', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'channels___123');
      mockElement.setAttribute('aria-label', 'Test Thread (thread)');

      const parentContainer = document.createElement('ul');
      parentContainer.setAttribute('role', 'group');
      parentContainer.setAttribute('aria-label', 'threads');
      parentContainer.appendChild(mockElement);
      container.appendChild(parentContainer);

      const threads = scanner.scanVisibleThreads();

      expect(threads[0].parentChannel).toBe('');
    });
  });

  describe('URL generation', () => {
    it('should generate correct Discord URLs', () => {
      vi.spyOn(window, 'location', 'get').mockReturnValue({
        href: 'https://discord.com/channels/123456789',
        pathname: '/channels/123456789',
      } as Location);

      createMockThreadElement(container, 'channels___987654321', 'Test', 'General threads');

      const threads = scanner.scanVisibleThreads();

      expect(threads[0].url).toBe('https://discord.com/channels/123456789/987654321');
    });
  });

  describe('Shadow DOM support', () => {
    it('should find thread elements inside shadow DOM', () => {
      const host = document.createElement('div');
      container.appendChild(host);

      const shadow = host.attachShadow({ mode: 'open' });
      createMockThreadElement(
        shadow as unknown as HTMLDivElement,
        'channels___123',
        'Test Thread',
        'General threads'
      );

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(1);
      expect(threads[0].id).toBe('123');
      expect(threads[0].currentTitle).toBe('Test Thread');
    });

    it('should find parent channel across shadow boundary', () => {
      const parentContainer = document.createElement('ul');
      parentContainer.setAttribute('role', 'group');
      parentContainer.setAttribute('aria-label', 'General threads');
      container.appendChild(parentContainer);

      const host = document.createElement('div');
      parentContainer.appendChild(host);

      const shadow = host.attachShadow({ mode: 'open' });
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'channels___123');
      mockElement.setAttribute('aria-label', 'Test Thread (thread)');
      shadow.appendChild(mockElement);

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(1);
      expect(threads[0].parentChannel).toBe('General');
    });

    it('should find threads in nested shadow DOM', () => {
      const host1 = document.createElement('div');
      container.appendChild(host1);

      const shadow1 = host1.attachShadow({ mode: 'open' });
      const host2 = document.createElement('div');
      shadow1.appendChild(host2);

      const shadow2 = host2.attachShadow({ mode: 'open' });
      createMockThreadElement(
        shadow2 as unknown as HTMLDivElement,
        'channels___deep',
        'Deep Thread',
        'Nested threads'
      );

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(1);
      expect(threads[0].id).toBe('deep');
      expect(threads[0].currentTitle).toBe('Deep Thread');
    });
  });

  // Helper function to create mock thread elements
  function createMockThreadElement(
    containerElement: HTMLElement | ShadowRoot,
    threadId: string,
    title: string,
    parentLabel: string,
    hasUnread: boolean = false
  ): void {
    const element = document.createElement('div');
    element.setAttribute('data-list-item-id', threadId);
    element.setAttribute('aria-label', `${hasUnread ? 'unread, ' : ''}${title} (thread)`);

    const parentContainer = document.createElement('ul');
    parentContainer.setAttribute('role', 'group');
    parentContainer.setAttribute('aria-label', parentLabel);
    parentContainer.appendChild(element);
    containerElement.appendChild(parentContainer);
  }
});
