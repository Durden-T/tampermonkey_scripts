import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

vi.mock('./core/PrefsStore', () => {
  const mockStore = new Map<string, unknown>();
  return {
    getPrefsStore: () => ({
      get: <T>(key: string): T | null => {
        const val = mockStore.get(key);
        return val === undefined ? null : (val as T);
      },
      set: async (key: string, value: unknown): Promise<void> => {
        mockStore.set(key, value);
      },
      remove: async (key: string): Promise<void> => {
        mockStore.delete(key);
      },
    }),
    resetPrefsStore: () => {
      mockStore.clear();
    },
  };
});

describe('i18n', () => {
  let mockNavigatorLanguage: string;

  beforeEach(async () => {
    mockNavigatorLanguage = 'zh-CN';

    vi.resetModules();

    const { resetPrefsStore } = await import('./core/PrefsStore');
    resetPrefsStore();

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
    });

    it('should switch to English language', async () => {
      const { setLanguage, getCurrentLanguage, getTexts } = await import('./i18n');

      setLanguage('en');

      expect(getCurrentLanguage()).toBe('en');
      expect(getTexts().title).toBe('Title Monitor');
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
