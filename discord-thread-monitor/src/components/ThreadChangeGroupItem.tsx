import React, { useState } from 'react';
import { formatTime, getTexts } from '../i18n';
import type { ThreadChangeGroup, TitleChange } from '../types';
import { ThreadActions } from './ThreadActions';
import { ChevronIcon } from './Icons';

interface ThreadChangeGroupItemProps {
  group: ThreadChangeGroup;
  onOpen: (url: string, threadId: string) => void;
  onBlock: (threadId: string) => void;
}

interface ThreadHeaderProps {
  threadTitle: string;
  hasMultipleChanges: boolean;
  expanded: boolean;
  parentChannel: string;
  latestChangeAt: number;
  onToggleExpand: () => void;
  thread: ThreadChangeGroup['thread'];
  threadId: string;
  onOpen: (url: string, threadId: string) => void;
  onBlock: (threadId: string) => void;
  changeCount: number;
}

const ThreadHeader = React.memo(
  ({
    threadTitle,
    hasMultipleChanges,
    expanded,
    parentChannel,
    latestChangeAt,
    onToggleExpand,
    thread,
    threadId,
    onOpen,
    onBlock,
    changeCount,
  }: ThreadHeaderProps) => {
    return (
      <div className="thread-group-header">
        <div className="thread-group-info" onClick={onToggleExpand}>
          {hasMultipleChanges && (
            <span className="expand-toggle">
              <ChevronIcon expanded={expanded} />
            </span>
          )}
          <div className="thread-group-title">
            <span className="title-text">{threadTitle}</span>
            {hasMultipleChanges && <span className="change-count">{changeCount}</span>}
          </div>
        </div>
        <div className="thread-group-meta">
          <span className="thread-time">{formatTime(latestChangeAt)}</span>
          {parentChannel && <span className="thread-channel">{parentChannel}</span>}
        </div>
        <ThreadActions
          threadId={threadId}
          threadUrl={thread?.url}
          onOpen={onOpen}
          onBlock={onBlock}
        />
      </div>
    );
  }
);
ThreadHeader.displayName = 'ThreadHeader';

const ChangeEntry = React.memo(
  ({ change, expanded }: { change: TitleChange; expanded: boolean }) => {
    const { labels } = getTexts();
    return (
      <div key={`${change.changedAt}`} className="change-entry">
        <div className="change-row">
          <span className="change-label">{labels.oldTitle}</span>
          <span className="change-old">{change.oldTitle}</span>
        </div>
        <div className="change-row">
          <span className="change-label">{labels.newTitle}</span>
          <span className="change-new">{change.newTitle}</span>
        </div>
        {expanded && <div className="change-time">{formatTime(change.changedAt)}</div>}
      </div>
    );
  }
);
ChangeEntry.displayName = 'ChangeEntry';

interface ThreadChangesProps {
  changes: TitleChange[];
  expanded: boolean;
  latestChange: TitleChange | undefined;
}

const ThreadChanges = React.memo<ThreadChangesProps>(({ changes, expanded, latestChange }) => {
  const changesToShow = expanded ? changes : latestChange ? [latestChange] : [];

  return (
    <div className={`thread-group-changes ${expanded ? 'expanded' : ''}`}>
      {changesToShow.map((change, index) => (
        <ChangeEntry key={`${change.changedAt}-${index}`} change={change} expanded={expanded} />
      ))}
    </div>
  );
});
ThreadChanges.displayName = 'ThreadChanges';

export const ThreadChangeGroupItem = React.memo(
  ({ group, onOpen, onBlock }: ThreadChangeGroupItemProps) => {
    const [expanded, setExpanded] = useState(false);

    const latestChange = group.changes[0];
    const hasMultipleChanges = group.changes.length > 1;
    const threadTitle = group.thread?.currentTitle ?? latestChange?.newTitle ?? '';
    const parentChannel = group.thread?.parentChannel ?? '';

    return (
      <div className={`thread-group ${group.hasUnseen ? 'unseen' : ''}`}>
        <ThreadHeader
          threadTitle={threadTitle}
          hasMultipleChanges={hasMultipleChanges}
          expanded={expanded}
          parentChannel={parentChannel}
          latestChangeAt={group.latestChangeAt}
          onToggleExpand={() => hasMultipleChanges && setExpanded(!expanded)}
          thread={group.thread}
          threadId={group.threadId}
          onOpen={onOpen}
          onBlock={onBlock}
          changeCount={group.changes.length}
        />

        <ThreadChanges changes={group.changes} expanded={expanded} latestChange={latestChange} />
      </div>
    );
  }
);
ThreadChangeGroupItem.displayName = 'ThreadChangeGroupItem';
