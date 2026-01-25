import React from 'react';
import { ThreadChangeGroupItem } from './ThreadChangeGroupItem';
import type { ThreadChangeGroup } from '../types';

interface ChangeGroupsListProps {
  changeGroups: ThreadChangeGroup[];
  emptyMessage: string;
  onOpen: (url: string, threadId: string) => void;
  onBlock: (threadId: string) => void;
}

export const ChangeGroupsList = React.memo(function ChangeGroupsList({
  changeGroups,
  emptyMessage,
  onOpen,
  onBlock,
}: ChangeGroupsListProps) {
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
});
