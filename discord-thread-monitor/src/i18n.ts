export const zh = {
  title: '标题监控',
  scanNow: '扫描',
  tabs: {
    changes: '变更',
    monitoring: '列表',
    blacklist: '屏蔽',
    debug: '调试',
  },
  actions: {
    open: '跳转',
    block: '屏蔽',
    resume: '恢复',
    markAllRead: '全部已读',
  },
  labels: {
    oldTitle: '原',
    newTitle: '新',
    noChanges: '暂无变更记录',
    noThreads: '暂无监控帖子',
    noBlacklist: '暂无屏蔽帖子',
    newThreadsFound: '发现 {count} 个新帖子',
    searchPlaceholder: '搜索标题或频道...',
    searchResults: '{count} 个结果',
  },
  filters: {
    allUnread: '未读',
    all: '全部',
    within: '最近',
    older: '更早',
    periods: {
      week: '7天',
      month: '30天',
      month3: '90天',
    },
  },
  time: {
    justNow: '刚刚',
    minutesAgo: '{n} 分钟前',
    hoursAgo: '{n} 小时前',
    daysAgo: '{n} 天前',
  },
  help: {
    title: '帮助',
    content: `自动监控已关注频道的帖子标题变化
点击「扫描」手动刷新
点击帖子跳转至 Discord
可将帖子加入屏蔽列表`,
  },
  debug: {
    title: '调试',
    simulateChange: '模拟变更',
    clearAll: '清空记录',
    forceStorageWarning: '强制存储警告',
    stats: {
      threads: '帖子',
      changes: '变更',
      unseen: '未读',
    },
  },
  settings: {
    retentionPeriod: '保留天数',
    days: '天',
    permanent: '永久',
    retentionHint: '修改后会删除超过保留天数的数据，0 = 永久，-1 = 删除全部',
    storageUsage: '存储占用',
    rawSize: '原始',
    compressedSize: '压缩后',
    compression: '压缩',
    enabled: '已启用',
    disabled: '未启用',
    storageTooLarge: '存储占用较大，可修改保留天数来清理超过天数的数据',
  },
  toast: {
    titleUpdated: '标题已更新',
  },
  scanError: '扫描持续失败，监控可能未生效',
};

export const en = {
  title: 'Title Monitor',
  scanNow: 'Scan',
  tabs: {
    changes: 'Changes',
    monitoring: 'Threads',
    blacklist: 'Blocked',
    debug: 'Debug',
  },
  actions: {
    open: 'Go',
    block: 'Block',
    resume: 'Unblock',
    markAllRead: 'Mark Read',
  },
  labels: {
    oldTitle: 'Was',
    newTitle: 'Now',
    noChanges: 'No changes yet',
    noThreads: 'No threads monitored',
    noBlacklist: 'No blocked threads',
    newThreadsFound: '{count} new threads found',
    searchPlaceholder: 'Search title or channel...',
    searchResults: '{count} results',
  },
  filters: {
    allUnread: 'Unread',
    all: 'All',
    within: 'Recent',
    older: 'Older',
    periods: {
      week: '7d',
      month: '1mo',
      month3: '3mo',
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
    content: `Monitors title changes in followed forum threads
Click Scan to refresh manually
Click a thread to open in Discord
Unwanted threads can be blocked`,
  },
  debug: {
    title: 'Debug',
    simulateChange: 'Simulate',
    clearAll: 'Clear All',
    forceStorageWarning: 'Force Storage Warning',
    stats: {
      threads: 'Threads',
      changes: 'Changes',
      unseen: 'Unseen',
    },
  },
  settings: {
    retentionPeriod: 'Retention',
    days: 'days',
    permanent: 'Permanent',
    retentionHint:
      'Changing this will delete data older than the retention period, 0 = forever, -1 = clear all',
    storageUsage: 'Storage',
    rawSize: 'Raw',
    compressedSize: 'Compressed',
    compression: 'Compression',
    enabled: 'On',
    disabled: 'Off',
    storageTooLarge: 'Storage is large, adjust retention days to clean up old data',
  },
  toast: {
    titleUpdated: 'Title changed',
  },
  scanError: 'Scans failing repeatedly, monitoring may not be working',
};

import { STORAGE, TIME_MS, TIME_UNITS } from './constants';
import { getPrefsStore } from './core/PrefsStore';

type I18nTexts = typeof zh;

const SUPPORTED_LANGUAGES = ['zh', 'en'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function detectLanguage(): SupportedLanguage {
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
  try {
    void getPrefsStore()
      .set(STORAGE.LANGUAGE_KEY, lang)
      .catch((error) => {
        console.error('Failed to persist language preference:', error);
      });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not initialized')) {
      return;
    }
    throw error;
  }
}

export function formatTime(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp < 0) {
    return getTexts().time.justNow;
  }

  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 0) {
    return getTexts().time.justNow;
  }

  const minutes = Math.floor(diff / TIME_MS.MINUTE);
  const hours = Math.floor(diff / TIME_MS.HOUR);
  const days = Math.floor(diff / TIME_MS.DAY);

  const texts = getTexts();

  if (minutes < 1) {
    return texts.time.justNow;
  }
  if (minutes < TIME_UNITS.MINUTES_PER_HOUR) {
    return texts.time.minutesAgo.replace('{n}', String(minutes));
  }
  if (hours < TIME_UNITS.HOURS_PER_DAY) {
    return texts.time.hoursAgo.replace('{n}', String(hours));
  }
  return texts.time.daysAgo.replace('{n}', String(days));
}
