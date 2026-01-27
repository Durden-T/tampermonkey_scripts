import { match } from 'pinyin-pro';
import type { MonitoredThread } from '../types';

const MAX_QUERY_LENGTH = 200;

function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

export function matchesQuery(text: string, query: string): boolean {
  if (!query.trim() || query.length > MAX_QUERY_LENGTH) {
    return false;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  if (lowerText.includes(lowerQuery)) {
    return true;
  }

  if (!containsChinese(text)) {
    return false;
  }

  const pinyinMatch = match(text, lowerQuery);
  return Array.isArray(pinyinMatch) && pinyinMatch.length > 0;
}

export function filterThreads(threads: MonitoredThread[], query: string): MonitoredThread[] {
  if (!query) {
    return threads;
  }
  return threads.filter(
    (thread) =>
      matchesQuery(thread.currentTitle, query) || matchesQuery(thread.parentChannel, query)
  );
}
