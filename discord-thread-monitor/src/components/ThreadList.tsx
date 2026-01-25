import { ChangeGroupsList } from './ChangeGroupsList';
import { ThreadsList } from './ThreadsList';
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
    return (
      <ChangeGroupsList
        changeGroups={changeGroups}
        emptyMessage={emptyMessage}
        onOpen={onOpen}
        onBlock={onBlock}
      />
    );
  }

  return (
    <ThreadsList
      threads={threads}
      changes={changes}
      isBlacklisted={isBlacklisted}
      emptyMessage={emptyMessage}
      onOpen={onOpen}
      onBlock={onBlock}
      onResume={onResume}
    />
  );
}
