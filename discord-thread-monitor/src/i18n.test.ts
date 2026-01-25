import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('i18n', () => {
  let mockLocalStorage: Record<string, string>;
  let mockNavigatorLanguage: string;

  beforeEach(() => {
    mockLocalStorage = {};
    mockNavigatorLanguage = 'zh-CN';

    vi.resetModules();

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
    });

    vi.stubGlobal('navigator', {
      language: mockNavigatorLanguage,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Language switching', () => {
    it('should switch to Chinese language', async () => {
      const { setLanguage, getCurrentLanguage, getTexts } = await import('./i18n');

      setLanguage('zh');

      expect(getCurrentLanguage()).toBe('zh');
      expect(getTexts().title).toBe('标题监控');
      expect(mockLocalStorage['thread-monitor-language']).toBe('zh');
    });

    it('should switch to English language', async () => {
      const { setLanguage, getCurrentLanguage, getTexts } = await import('./i18n');

      setLanguage('en');

      expect(getCurrentLanguage()).toBe('en');
      expect(getTexts().title).toBe('Title Monitor');
      expect(mockLocalStorage['thread-monitor-language']).toBe('en');
    });
  });

  describe('formatTime', () => {
    let formatTime: (timestamp: number) => string;

    beforeEach(async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z').getTime());

      const i18n = await import('./i18n');
      formatTime = i18n.formatTime;
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should format time correctly in Chinese', () => {
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;
      const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;

      expect(formatTime(fiveMinutesAgo)).toBe('5 分钟前');
      expect(formatTime(twoHoursAgo)).toBe('2 小时前');
      expect(formatTime(threeDaysAgo)).toBe('3 天前');
    });

    it('should format time correctly in English after language switch', async () => {
      const { setLanguage } = await import('./i18n');
      setLanguage('en');

      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;
      const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;

      expect(formatTime(fiveMinutesAgo)).toBe('5m ago');
      expect(formatTime(twoHoursAgo)).toBe('2h ago');
      expect(formatTime(threeDaysAgo)).toBe('3d ago');
    });
  });
});
