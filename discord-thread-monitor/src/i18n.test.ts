import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('i18n', () => {
  let mockLocalStorage: Record<string, string>;
  let mockNavigatorLanguage: string;

  beforeEach(() => {
    mockLocalStorage = {};
    mockNavigatorLanguage = 'zh-CN';

    // Clear any cached modules first
    vi.resetModules();

    // Mock localStorage before any imports
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

  describe('Language Detection', () => {
    it('should use saved language from localStorage if present', async () => {
      mockLocalStorage['thread-monitor-language'] = 'en';
      mockNavigatorLanguage = 'zh-CN';

      const { getCurrentLanguage, getTexts } = await import('./i18n');

      expect(getCurrentLanguage()).toBe('en');
      expect(getTexts().title).toBe('Thread Monitor');
    });

    it('should default to Chinese for non-English browser languages', async () => {
      mockNavigatorLanguage = 'fr-FR';

      const { getCurrentLanguage, getTexts } = await import('./i18n');

      expect(getCurrentLanguage()).toBe('zh');
      expect(getTexts().title).toBe('帖子监控');
    });
  });

  describe('setLanguage', () => {
    it('should switch to Chinese language', async () => {
      const { setLanguage, getCurrentLanguage, getTexts } = await import('./i18n');

      setLanguage('zh');

      expect(getCurrentLanguage()).toBe('zh');
      expect(getTexts().title).toBe('帖子监控');
      expect(mockLocalStorage['thread-monitor-language']).toBe('zh');
    });

    it('should switch to English language', async () => {
      const { setLanguage, getCurrentLanguage, getTexts } = await import('./i18n');

      setLanguage('en');

      expect(getCurrentLanguage()).toBe('en');
      expect(getTexts().title).toBe('Thread Monitor');
      expect(mockLocalStorage['thread-monitor-language']).toBe('en');
    });

    it('should not switch to invalid language', async () => {
      const { setLanguage, getCurrentLanguage, getTexts } = await import('./i18n');
      const initialLang = getCurrentLanguage();
      const initialTexts = getTexts();

      // @ts-expect-error - testing invalid input
      setLanguage('invalid');

      expect(getCurrentLanguage()).toBe(initialLang);
      expect(getTexts()).toBe(initialTexts);
      expect(mockLocalStorage['thread-monitor-language']).toBeUndefined();
    });

    it('should not switch to unsupported language', async () => {
      const { setLanguage, getCurrentLanguage, getTexts } = await import('./i18n');
      const initialLang = getCurrentLanguage();
      const initialTexts = getTexts();

      // @ts-expect-error - testing invalid input
      setLanguage('fr');

      expect(getCurrentLanguage()).toBe(initialLang);
      expect(getTexts()).toBe(initialTexts);
      expect(mockLocalStorage['thread-monitor-language']).toBeUndefined();
    });
  });

  describe('getTexts and getCurrentLanguage', () => {
    it('should return correct Chinese texts', async () => {
      const { getTexts, getCurrentLanguage } = await import('./i18n');

      const texts = getTexts();
      const lang = getCurrentLanguage();

      expect(lang).toBe('zh');
      expect(texts.title).toBe('帖子监控');
      expect(texts.scanNow).toBe('扫描');
      expect(texts.tabs.changes).toBe('变更');
      expect(texts.tabs.monitoring).toBe('监控');
    });

    it('should return correct English texts after switching', async () => {
      const { setLanguage, getTexts, getCurrentLanguage } = await import('./i18n');

      setLanguage('en');

      const texts = getTexts();
      const lang = getCurrentLanguage();

      expect(lang).toBe('en');
      expect(texts.title).toBe('Thread Monitor');
      expect(texts.scanNow).toBe('Scan');
      expect(texts.tabs.changes).toBe('Changes');
      expect(texts.tabs.monitoring).toBe('Monitor');
    });
  });

  describe('formatTime', () => {
    let formatTime: (timestamp: number) => string;

    beforeEach(async () => {
      // Mock Date.now() to have a consistent reference point
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z').getTime());

      const i18n = await import('./i18n');
      formatTime = i18n.formatTime;
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "just now" for very recent timestamps', () => {
      const now = Date.now();
      const recent = now - 1000; // 1 second ago

      expect(formatTime(recent)).toBe('刚刚');
    });

    it('should format minutes correctly in Chinese', () => {
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;

      expect(formatTime(fiveMinutesAgo)).toBe('5分钟前');
    });

    it('should format hours correctly in Chinese', () => {
      const now = Date.now();
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;

      expect(formatTime(twoHoursAgo)).toBe('2小时前');
    });

    it('should format days correctly in Chinese', () => {
      const now = Date.now();
      const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;

      expect(formatTime(threeDaysAgo)).toBe('3天前');
    });

    it('should use English format after language switch', async () => {
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

    it('should handle edge cases for time formatting', () => {
      const now = Date.now();

      // Exactly 1 minute
      const oneMinuteAgo = now - 60 * 1000;
      expect(formatTime(oneMinuteAgo)).toBe('1分钟前');

      // Exactly 1 hour
      const oneHourAgo = now - 60 * 60 * 1000;
      expect(formatTime(oneHourAgo)).toBe('1小时前');

      // Exactly 1 day
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      expect(formatTime(oneDayAgo)).toBe('1天前');
    });
  });

  describe('Text content completeness', () => {
    it('should have all expected Chinese text keys', async () => {
      const { getTexts } = await import('./i18n');

      const texts = getTexts();

      // Check main structure
      expect(texts.title).toBeDefined();
      expect(texts.scanNow).toBeDefined();

      // Check tabs
      expect(texts.tabs.changes).toBeDefined();
      expect(texts.tabs.monitoring).toBeDefined();
      expect(texts.tabs.blacklist).toBeDefined();
      expect(texts.tabs.debug).toBeDefined();

      // Check actions
      expect(texts.actions.open).toBeDefined();
      expect(texts.actions.block).toBeDefined();
      expect(texts.actions.resume).toBeDefined();
      expect(texts.actions.clearChanges).toBeDefined();
      expect(texts.actions.markAllRead).toBeDefined();

      // Check labels
      expect(texts.labels.oldTitle).toBeDefined();
      expect(texts.labels.newTitle).toBeDefined();
      expect(texts.labels.noChanges).toBeDefined();
      expect(texts.labels.noThreads).toBeDefined();
      expect(texts.labels.noBlacklist).toBeDefined();
      expect(texts.labels.newThreadsFound).toBeDefined();

      // Check filters
      expect(texts.filters.all).toBeDefined();
      expect(texts.filters.within).toBeDefined();
      expect(texts.filters.older).toBeDefined();
      expect(texts.filters.periods.day).toBeDefined();
      expect(texts.filters.periods.week).toBeDefined();
      expect(texts.filters.periods.month).toBeDefined();
      expect(texts.filters.periods.month3).toBeDefined();
      expect(texts.filters.periods.month6).toBeDefined();
      expect(texts.filters.periods.year).toBeDefined();

      // Check time
      expect(texts.time.justNow).toBeDefined();
      expect(texts.time.minutesAgo).toBeDefined();
      expect(texts.time.hoursAgo).toBeDefined();
      expect(texts.time.daysAgo).toBeDefined();

      // Check help
      expect(texts.help.title).toBeDefined();
      expect(texts.help.content).toBeDefined();

      // Check debug
      expect(texts.debug.title).toBeDefined();
      expect(texts.debug.simulateChange).toBeDefined();
      expect(texts.debug.clearAll).toBeDefined();
      expect(texts.debug.stats.threads).toBeDefined();
      expect(texts.debug.stats.changes).toBeDefined();
      expect(texts.debug.stats.unseen).toBeDefined();

      // Check settings
      expect(texts.settings.retentionPeriod).toBeDefined();
      expect(texts.settings.days).toBeDefined();
      expect(texts.settings.permanent).toBeDefined();
      expect(texts.settings.storageUsage).toBeDefined();
      expect(texts.settings.rawSize).toBeDefined();
      expect(texts.settings.compressedSize).toBeDefined();
      expect(texts.settings.compression).toBeDefined();
      expect(texts.settings.enabled).toBeDefined();
      expect(texts.settings.disabled).toBeDefined();
      expect(texts.settings.storageTooLarge).toBeDefined();

      // Check toast
      expect(texts.toast.titleUpdated).toBeDefined();
    });

    it('should have matching structure between Chinese and English', async () => {
      const i18n = await import('./i18n');

      // Helper function to recursively check object structure
      const checkStructure = (zhObj: any, enObj: any, path = '') => {
        for (const key in zhObj) {
          const currentPath = path ? `${path}.${key}` : key;

          if (typeof zhObj[key] === 'object' && zhObj[key] !== null) {
            expect(enObj[key]).toBeDefined();
            checkStructure(zhObj[key], enObj[key], currentPath);
          } else {
            expect(enObj).toHaveProperty(key);
          }
        }
      };

      // Access the actual objects from the module
      const zhObj = i18n.zh;
      const enObj = i18n.en;

      checkStructure(zhObj, enObj);
    });
  });
});
