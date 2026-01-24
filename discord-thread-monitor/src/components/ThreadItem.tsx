import { formatTime, getTexts } from '../i18n';
import type { MonitoredThread, TitleChange } from '../types';

interface ThreadItemProps {
  thread: MonitoredThread;
  change?: TitleChange;
  isBlacklisted?: boolean;
  onOpen: (url: string, threadId: string) => void;
  onBlock: (threadId: string) => void;
  onResume: (threadId: string) => void;
}

export function ThreadItem({
  thread,
  change,
  isBlacklisted,
  onOpen,
  onBlock,
  onResume,
}: ThreadItemProps) {
  const t = getTexts();

  return (
    <div className={`thread-item ${change && !change.seen ? 'unseen' : ''}`}>
      <div className="thread-info">
        {change ? (
          <div className="thread-change">
            <div className="thread-change-row">
              <span className="change-label">{t.labels.oldTitle}</span>
              <span className="change-old">{change.oldTitle}</span>
            </div>
            <div className="thread-change-row">
              <span className="change-label">{t.labels.newTitle}</span>
              <span className="change-new">{change.newTitle}</span>
            </div>
          </div>
        ) : (
          <div className="thread-title">{thread.currentTitle}</div>
        )}
        <div className="thread-meta">
          {change && (
            <span className="thread-time">{formatTime(change.changedAt)}</span>
          )}
          {thread.parentChannel && (
            <span className="thread-channel">{thread.parentChannel}</span>
          )}
        </div>
      </div>
      <div className="thread-actions">
        {!isBlacklisted ? (
          <>
            <button onClick={() => onOpen(thread.url, thread.id)}>{t.actions.open}</button>
            <button onClick={() => onBlock(thread.id)}>{t.actions.block}</button>
          </>
        ) : (
          <button onClick={() => onResume(thread.id)}>
            {t.actions.resume}
          </button>
        )}
      </div>
    </div>
  );
}
