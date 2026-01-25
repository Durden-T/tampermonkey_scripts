export const zh = {
  title: '帖子监控',
  scanNow: '扫描',
  tabs: {
    changes: '变更',
    monitoring: '监控',
    blacklist: '屏蔽',
    debug: '调试',
  },
  actions: {
    open: '打开',
    block: '屏蔽',
    resume: '恢复',
    clearChanges: '清空',
    markAllRead: '全部已读',
  },
  labels: {
    oldTitle: '旧',
    newTitle: '新',
    noChanges: '暂无标题变更',
    noThreads: '暂无监控帖子',
    noBlacklist: '暂无屏蔽帖子',
    newThreadsFound: '发现 {count} 个新帖子',
  },
  filters: {
    all: '全部',
    within: '近期',
    older: '更早',
    periods: {
      day: '24h',
      week: '7天',
      month: '1月',
      month3: '3月',
      month6: '半年',
      year: '1年',
    },
  },
  time: {
    justNow: '刚刚',
    minutesAgo: '{n}分钟前',
    hoursAgo: '{n}小时前',
    daysAgo: '{n}天前',
  },
  help: {
    title: '使用帮助',
    content: `自动监控所有已关注频道的帖子
每次打开Discord时自动检测标题变更
点击「扫描」手动刷新
点击帖子可直接跳转
不想监控的帖子可加入屏蔽列表`,
  },
  debug: {
    title: '调试面板',
    simulateChange: '模拟标题变化',
    clearAll: '清除所有变化',
    stats: {
      threads: '监控线程',
      changes: '标题变化',
      unseen: '未读数量',
    },
  },
  settings: {
    retentionPeriod: '保留期限',
    days: '天',
    permanent: '永久',
    storageUsage: '存储使用',
    rawSize: '原始大小',
    compressedSize: '压缩后',
    compression: '压缩状态',
    enabled: '已启用',
    disabled: '未启用',
    storageTooLarge: '存储空间较大，如果感到卡顿可减少保留天数',
  },
  toast: {
    titleUpdated: '标题已更新',
  },
};

export const en = {
  title: 'Thread Monitor',
  scanNow: 'Scan',
  tabs: {
    changes: 'Changes',
    monitoring: 'Monitor',
    blacklist: 'Blocked',
    debug: 'Debug',
  },
  actions: {
    open: 'Open',
    block: 'Block',
    resume: 'Resume',
    clearChanges: 'Clear',
    markAllRead: 'Mark All Read',
  },
  labels: {
    oldTitle: 'Old',
    newTitle: 'New',
    noChanges: 'No title changes yet',
    noThreads: 'No threads being monitored',
    noBlacklist: 'No blocked threads',
    newThreadsFound: 'Found {count} new threads',
  },
  filters: {
    all: 'All',
    within: 'Within',
    older: 'Older',
    periods: {
      day: '24h',
      week: '7d',
      month: '1mo',
      month3: '3mo',
      month6: '6mo',
      year: '1yr',
    },
  },
  time: {
    justNow: 'Just now',
    minutesAgo: '{n}m ago',
    hoursAgo: '{n}h ago',
    daysAgo: '{n}d ago',
  },
  help: {
    title: 'Help',
    content: `Automatically monitors all followed forum threads
Detects title changes when you open Discord
Click Scan to manually refresh
Click a thread to navigate to it
Add unwanted threads to the blocklist`,
  },
  debug: {
    title: 'Debug Panel',
    simulateChange: 'Simulate Change',
    clearAll: 'Clear All',
    stats: {
      threads: 'Threads',
      changes: 'Changes',
      unseen: 'Unseen',
    },
  },
  settings: {
    retentionPeriod: 'Retention Period',
    days: 'days',
    permanent: 'Permanent',
    storageUsage: 'Storage Usage',
    rawSize: 'Raw Size',
    compressedSize: 'Compressed',
    compression: 'Compression',
    enabled: 'Enabled',
    disabled: 'Disabled',
    storageTooLarge: 'Storage is large. If experiencing lag, consider reducing retention days',
  },
  toast: {
    titleUpdated: 'Title Updated',
  },
};

type I18nTexts = typeof zh;

const LANGUAGE_STORAGE_KEY = 'thread-monitor-language';
const SUPPORTED_LANGUAGES = ['zh', 'en'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function detectLanguage(): SupportedLanguage {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved && SUPPORTED_LANGUAGES.includes(saved as SupportedLanguage)) {
    return saved as SupportedLanguage;
  }

  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('en')) {
    return 'en';
  }

  return 'zh';
}

let currentLanguage: SupportedLanguage = detectLanguage();
let currentTexts: I18nTexts = currentLanguage === 'en' ? en : zh;

export function getTexts(): I18nTexts {
  return currentTexts;
}

export function getCurrentLanguage(): SupportedLanguage {
  return currentLanguage;
}

export function setLanguage(lang: SupportedLanguage): void {
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    return;
  }
  currentLanguage = lang;
  currentTexts = lang === 'en' ? en : zh;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
}

export function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  const texts = getTexts();

  if (minutes < 1) return texts.time.justNow;
  if (minutes < 60) return texts.time.minutesAgo.replace('{n}', String(minutes));
  if (hours < 24) return texts.time.hoursAgo.replace('{n}', String(hours));
  return texts.time.daysAgo.replace('{n}', String(days));
}
