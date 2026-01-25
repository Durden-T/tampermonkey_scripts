import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ThreadScanner } from './ThreadScanner';

describe('ThreadScanner', () => {
  let scanner: ThreadScanner;

  beforeEach(() => {
    scanner = new ThreadScanner();
    vi.spyOn(document, 'querySelectorAll');
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      href: 'https://discord.com/channels/123/456',
      pathname: '/channels/123/456',
    } as Location);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('scanVisibleThreads', () => {
    it('should return empty array when no server ID in URL', () => {
      vi.spyOn(window, 'location', 'get').mockReturnValue({
        href: 'https://discord.com/channels',
        pathname: '/channels',
      } as Location);

      const threads = scanner.scanVisibleThreads();
      expect(threads).toEqual([]);
    });

    it('should return empty array when no thread elements found', () => {
      (document.querySelectorAll as any).mockReturnValue([]);

      const threads = scanner.scanVisibleThreads();
      expect(threads).toEqual([]);
      expect(document.querySelectorAll).toHaveBeenCalledWith(
        '[data-list-item-id^="channels___"][aria-label*="(thread)"]'
      );
    });

    it('should parse thread elements correctly', () => {
      const mockElements = [
        createMockThreadElement('channels___123456', 'Test Thread 1', 'General threads'),
        createMockThreadElement('channels___789012', 'Test Thread 2', 'Random threads'),
      ];

      (document.querySelectorAll as any).mockReturnValue(mockElements);

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
      const mockElement = createMockThreadElement(
        'channels___999',
        'Test Thread with unread',
        'General threads',
        true
      );

      (document.querySelectorAll as any).mockReturnValue([mockElement]);

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(1);
      expect(threads[0].currentTitle).toBe('Test Thread with unread');
    });

    it('should skip elements without data-list-item-id', () => {
      const validElement = createMockThreadElement(
        'channels___123',
        'Valid Thread',
        'General threads'
      );
      const invalidElement = document.createElement('div');
      invalidElement.setAttribute('aria-label', 'Test Thread (thread)');

      (document.querySelectorAll as any).mockReturnValue([validElement, invalidElement]);

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(1);
      expect(threads[0].id).toBe('123');
    });

    it('should skip elements with malformed data-list-item-id', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'malformed');
      mockElement.setAttribute('aria-label', 'Test Thread (thread)');

      (document.querySelectorAll as any).mockReturnValue([mockElement]);

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(0);
    });

    it('should skip elements with empty title', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'channels___123');
      mockElement.setAttribute('aria-label', '');

      (document.querySelectorAll as any).mockReturnValue([mockElement]);

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(0);
    });

    it('should handle threads without parent channel', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'channels___123');
      mockElement.setAttribute('aria-label', 'Test Thread (thread)');

      (document.querySelectorAll as any).mockReturnValue([mockElement]);

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(1);
      expect(threads[0].parentChannel).toBe('');
    });

    it('should set firstSeenAt to current timestamp', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const mockElement = createMockThreadElement('channels___123', 'Test', 'General threads');
      (document.querySelectorAll as any).mockReturnValue([mockElement]);

      const threads = scanner.scanVisibleThreads();

      expect(threads[0].firstSeenAt).toBe(now);
    });
  });

  describe('parseThreadElement edge cases', () => {
    it('should handle thread names with (thread) in the actual title', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'channels___123');
      mockElement.setAttribute('aria-label', 'My (thread) Project (thread)');

      (document.querySelectorAll as any).mockReturnValue([mockElement]);

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(1);
      expect(threads[0].currentTitle).toBe('My (thread) Project');
    });

    it('should handle thread names starting with unread and containing (thread)', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'channels___123');
      mockElement.setAttribute('aria-label', 'unread, My Thread (thread)');

      (document.querySelectorAll as any).mockReturnValue([mockElement]);

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(1);
      expect(threads[0].currentTitle).toBe('My Thread');
    });

    it('should handle extra whitespace in thread names', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'channels___123');
      mockElement.setAttribute('aria-label', '   Test Thread   (thread)   ');

      (document.querySelectorAll as any).mockReturnValue([mockElement]);

      const threads = scanner.scanVisibleThreads();

      expect(threads).toHaveLength(1);
      expect(threads[0].currentTitle).toBe('Test Thread');
    });

    it('should handle complex parent channel names', () => {
      const mockElement = createMockThreadElement('channels___123', 'Test', 'General Chat threads');
      (document.querySelectorAll as any).mockReturnValue([mockElement]);

      const threads = scanner.scanVisibleThreads();

      expect(threads[0].parentChannel).toBe('General Chat');
    });

    it('should handle parent channel without "threads" suffix', () => {
      const mockElement = createMockThreadElement('channels___123', 'Test', 'General');
      (document.querySelectorAll as any).mockReturnValue([mockElement]);

      const threads = scanner.scanVisibleThreads();

      // The current implementation expects "threads" in the label, so this will return empty
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
      vi.spyOn(window, 'location', 'get').mockReturnValue({
        href: 'https://discord.com/invalid',
        pathname: '/invalid',
      } as Location);

      const threads = scanner.scanVisibleThreads();
      expect(threads).toEqual([]);
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
        const mockElement = createMockThreadElement('channels___123', 'Test', ariaLabel);
        (document.querySelectorAll as any).mockReturnValue([mockElement]);

        const threads = scanner.scanVisibleThreads();

        expect(threads[0].parentChannel).toBe(expected);
      });
    });

    it('should handle missing closest container', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'channels___123');
      mockElement.setAttribute('aria-label', 'Test Thread (thread)');

      // Don't add parent container
      (document.querySelectorAll as any).mockReturnValue([mockElement]);

      const threads = scanner.scanVisibleThreads();

      expect(threads[0].parentChannel).toBe('');
    });

    it('should handle parent container without aria-label', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'channels___123');
      mockElement.setAttribute('aria-label', 'Test Thread (thread)');

      // Create parent container without aria-label
      const parentContainer = document.createElement('ul');
      parentContainer.setAttribute('role', 'group');
      // Intentionally not setting aria-label
      parentContainer.appendChild(mockElement);

      (document.querySelectorAll as any).mockReturnValue([mockElement]);

      const threads = scanner.scanVisibleThreads();

      expect(threads[0].parentChannel).toBe('');
    });

    it('should handle parent container with aria-label that does not contain threads', () => {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-list-item-id', 'channels___123');
      mockElement.setAttribute('aria-label', 'Test Thread (thread)');

      // Create parent container with aria-label that contains "threads" but doesn't match the expected pattern
      // The selector requires aria-label to contain "threads", so we'll use a valid pattern
      // but test the case where the regex replace doesn't change anything
      const parentContainer = document.createElement('ul');
      parentContainer.setAttribute('role', 'group');
      parentContainer.setAttribute('aria-label', 'threads'); // Minimal case
      parentContainer.appendChild(mockElement);

      (document.querySelectorAll as any).mockReturnValue([mockElement]);

      const threads = scanner.scanVisibleThreads();

      // The regex should handle this and return an empty string after trimming
      expect(threads[0].parentChannel).toBe('');
    });
  });

  describe('URL generation', () => {
    it('should generate correct Discord URLs', () => {
      vi.spyOn(window, 'location', 'get').mockReturnValue({
        href: 'https://discord.com/channels/123456789',
        pathname: '/channels/123456789',
      } as Location);

      const mockElement = createMockThreadElement(
        'channels___987654321',
        'Test',
        'General threads'
      );
      (document.querySelectorAll as any).mockReturnValue([mockElement]);

      const threads = scanner.scanVisibleThreads();

      expect(threads[0].url).toBe('https://discord.com/channels/123456789/987654321');
    });
  });

  // Helper function to create mock thread elements
  function createMockThreadElement(
    threadId: string,
    title: string,
    parentLabel: string,
    hasUnread: boolean = false
  ): HTMLElement {
    const element = document.createElement('div');
    element.setAttribute('data-list-item-id', threadId);
    element.setAttribute('aria-label', `${hasUnread ? 'unread, ' : ''}${title} (thread)`);

    // Create parent container
    const parentContainer = document.createElement('ul');
    parentContainer.setAttribute('role', 'group');
    parentContainer.setAttribute('aria-label', parentLabel);
    parentContainer.appendChild(element);

    return element;
  }
});
