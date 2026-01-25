import React, { useMemo } from 'react';
import { ThreadItem } from './ThreadItem';
import type { MonitoredThread, TitleChange } from '../types';

interface ThreadsListProps {
  threads: MonitoredThread[];
  changes: TitleChange[];
  isBlacklisted: boolean;
  emptyMessage: string;
  onOpen: (url: string, threadId: string) => void;
  onBlock: (threadId: string) => void;
  onResume: (threadId: string) => void;
}

export const ThreadsList = React.memo(function ThreadsList({
  threads,
  changes,
  isBlacklisted,
  emptyMessage,
  onOpen,
  onBlock,
  onResume,
}: ThreadsListProps) {
  const changesMap = useMemo(() => {
    const map = new Map<string, TitleChange>();
    for (const change of changes) {
      if (!map.has(change.threadId)) {
        map.set(change.threadId, change);
      }
    }
    return map;
  }, [changes]);

  if (threads.length === 0) {
    return <div className="empty-message">{emptyMessage}</div>;
  }

  return (
    <div className="thread-list">
      {threads.map((thread) => (
        <ThreadItem
          key={thread.id}
          thread={thread}
          change={changesMap.get(thread.id)}
          isBlacklisted={isBlacklisted}
          onOpen={onOpen}
          onBlock={onBlock}
          onResume={onResume}
        />
      ))}
    </div>
  );
});
