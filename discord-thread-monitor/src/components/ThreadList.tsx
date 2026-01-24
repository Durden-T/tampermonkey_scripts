import { ThreadItem } from './ThreadItem';
import { ThreadChangeGroupItem } from './ThreadChangeGroupItem';
import type { MonitoredThread, TitleChange, ThreadChangeGroup } from '../types';

interface ThreadListProps {
  threads: MonitoredThread[];
  changes?: TitleChange[];
  changeGroups?: ThreadChangeGroup[];
  isBlacklisted?: boolean;
  emptyMessage: string;
  onOpen: (url: string, threadId: string) => void;
  onBlock: (threadId: string) => void;
  onResume: (threadId: string) => void;
}

export function ThreadList({
  threads,
  changes = [],
  changeGroups,
  isBlacklisted = false,
  emptyMessage,
  onOpen,
  onBlock,
  onResume,
}: ThreadListProps) {
  if (changeGroups) {
    if (changeGroups.length === 0) {
      return <div className="empty-message">{emptyMessage}</div>;
    }

    return (
      <div className="thread-list">
        {changeGroups.map((group) => (
          <ThreadChangeGroupItem
            key={group.threadId}
            group={group}
            onOpen={onOpen}
            onBlock={onBlock}
          />
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return <div className="empty-message">{emptyMessage}</div>;
  }

  const getChangeForThread = (threadId: string): TitleChange | undefined => {
    return changes.find((c) => c.threadId === threadId);
  };

  return (
    <div className="thread-list">
      {threads.map((thread) => (
        <ThreadItem
          key={thread.id}
          thread={thread}
          change={getChangeForThread(thread.id)}
          isBlacklisted={isBlacklisted}
          onOpen={onOpen}
          onBlock={onBlock}
          onResume={onResume}
        />
      ))}
    </div>
  );
}
