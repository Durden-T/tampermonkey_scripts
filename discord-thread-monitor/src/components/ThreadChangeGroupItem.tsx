import { useState } from 'react';
import { formatTime, getTexts } from '../i18n';
import type { ThreadChangeGroup } from '../types';

interface ThreadChangeGroupItemProps {
  group: ThreadChangeGroup;
  onOpen: (url: string, threadId: string) => void;
  onBlock: (threadId: string) => void;
}

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="14"
    height="14"
    style={{
      transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
      transition: 'transform 0.15s ease',
    }}
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export function ThreadChangeGroupItem({
  group,
  onOpen,
  onBlock,
}: ThreadChangeGroupItemProps) {
  const [expanded, setExpanded] = useState(false);
  const t = getTexts();

  const latestChange = group.changes[0];
  const hasMultipleChanges = group.changes.length > 1;
  const threadTitle = group.thread?.currentTitle ?? latestChange.newTitle;
  const parentChannel = group.thread?.parentChannel ?? '';

  return (
    <div className={`thread-group ${group.hasUnseen ? 'unseen' : ''}`}>
      <div className="thread-group-header">
        <div className="thread-group-info" onClick={() => hasMultipleChanges && setExpanded(!expanded)}>
          {hasMultipleChanges && (
            <span className="expand-toggle">
              <ChevronIcon expanded={expanded} />
            </span>
          )}
          <div className="thread-group-title">
            <span className="title-text">{threadTitle}</span>
            {hasMultipleChanges && (
              <span className="change-count">{group.changes.length}</span>
            )}
          </div>
        </div>
        <div className="thread-group-meta">
          <span className="thread-time">{formatTime(group.latestChangeAt)}</span>
          {parentChannel && <span className="thread-channel">{parentChannel}</span>}
        </div>
        <div className="thread-actions">
          {group.thread && (
            <button onClick={() => onOpen(group.thread!.url, group.threadId)}>{t.actions.open}</button>
          )}
          <button onClick={() => onBlock(group.threadId)}>{t.actions.block}</button>
        </div>
      </div>

      <div className={`thread-group-changes ${expanded || !hasMultipleChanges ? 'expanded' : ''}`}>
        {(expanded ? group.changes : [latestChange]).map((change, index) => (
          <div key={`${change.changedAt}-${index}`} className="change-entry">
            <div className="change-row">
              <span className="change-label">{t.labels.oldTitle}</span>
              <span className="change-old">{change.oldTitle}</span>
            </div>
            <div className="change-row">
              <span className="change-label">{t.labels.newTitle}</span>
              <span className="change-new">{change.newTitle}</span>
            </div>
            {expanded && (
              <div className="change-time">{formatTime(change.changedAt)}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
