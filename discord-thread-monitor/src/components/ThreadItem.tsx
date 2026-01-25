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

const ThreadChangeDisplay = ({
  change,
  t,
}: {
  change: TitleChange;
  t: ReturnType<typeof getTexts>;
}) => (
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
);

export function ThreadItem({
  thread,
  change,
  isBlacklisted,
  onOpen,
  onBlock,
  onResume,
}: ThreadItemProps) {
  const t = getTexts();
  const isUnseen = change && !change.seen;

  return (
    <div className={`thread-item ${isUnseen ? 'unseen' : ''}`}>
      <div className="thread-info">
        {change ? (
          <ThreadChangeDisplay change={change} t={t} />
        ) : (
          <div className="thread-title">{thread.currentTitle}</div>
        )}
        <div className="thread-meta">
          {change && <span className="thread-time">{formatTime(change.changedAt)}</span>}
          {thread.parentChannel && <span className="thread-channel">{thread.parentChannel}</span>}
        </div>
      </div>
      <div className="thread-actions">
        {!isBlacklisted ? (
          <>
            <button onClick={() => onOpen(thread.url, thread.id)}>{t.actions.open}</button>
            <button onClick={() => onBlock(thread.id)}>{t.actions.block}</button>
          </>
        ) : (
          <button onClick={() => onResume(thread.id)}>{t.actions.resume}</button>
        )}
      </div>
    </div>
  );
}
