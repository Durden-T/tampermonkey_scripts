import React from 'react';
import { getTexts } from '../i18n';

interface ThreadActionsProps {
  threadId: string;
  threadUrl?: string;
  isBlacklisted?: boolean;
  onOpen?: (url: string, threadId: string) => void;
  onBlock?: (threadId: string) => void;
  onResume?: (threadId: string) => void;
}

export const ThreadActions = React.memo(function ThreadActions({
  threadId,
  threadUrl,
  isBlacklisted,
  onOpen,
  onBlock,
  onResume,
}: ThreadActionsProps) {
  const t = getTexts();

  if (isBlacklisted) {
    return (
      <div className="thread-actions">
        {onResume && <button onClick={() => onResume(threadId)}>{t.actions.resume}</button>}
      </div>
    );
  }

  return (
    <div className="thread-actions">
      {threadUrl && onOpen && (
        <button onClick={() => onOpen(threadUrl, threadId)}>{t.actions.open}</button>
      )}
      {onBlock && <button onClick={() => onBlock(threadId)}>{t.actions.block}</button>}
    </div>
  );
});
