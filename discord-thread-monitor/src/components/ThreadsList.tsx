import React, { useMemo, useState } from 'react';
import { ThreadItem } from './ThreadItem';
import { getTexts } from '../i18n';
import { filterThreads } from '../utils/threadFilters';
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

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  resultCount: number;
  totalCount: number;
}

const SearchIcon = () => (
  <svg
    className="thread-search-icon"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="7" cy="7" r="5" />
    <path d="M14 14l-3.5-3.5" />
  </svg>
);

const ClearIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

function buildChangesMap(changes: TitleChange[]): Map<string, TitleChange> {
  const map = new Map<string, TitleChange>();
  for (const change of changes) {
    if (!map.has(change.threadId)) {
      map.set(change.threadId, change);
    }
  }
  return map;
}

const SearchResultCount = React.memo(function SearchResultCount({ count }: { count: number }) {
  const texts = getTexts();
  return (
    <div className="thread-search-results">
      <span className="thread-search-results-count">
        {texts.labels.searchResults.replace('{count}', String(count))}
      </span>
    </div>
  );
});

const SearchInput = React.memo(function SearchInput({
  value,
  onChange,
  placeholder,
  resultCount,
  totalCount,
}: SearchInputProps) {
  const hasValue = value.length > 0;
  const isFiltering = hasValue && resultCount < totalCount;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <>
      <div className="thread-search-wrapper">
        <input
          type="text"
          className={`thread-search ${hasValue ? 'has-value' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <SearchIcon />
        <button
          type="button"
          className={`thread-search-clear ${hasValue ? 'visible' : ''}`}
          onClick={handleClear}
          aria-label="Clear search"
        >
          <ClearIcon />
        </button>
      </div>
      {isFiltering && <SearchResultCount count={resultCount} />}
    </>
  );
});

export const ThreadsList = React.memo(function ThreadsList({
  threads,
  changes,
  isBlacklisted,
  emptyMessage,
  onOpen,
  onBlock,
  onResume,
}: ThreadsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const texts = getTexts();

  const changesMap = useMemo(() => buildChangesMap(changes), [changes]);
  const filteredThreads = useMemo(
    () => filterThreads(threads, searchQuery),
    [threads, searchQuery]
  );

  if (threads.length === 0) {
    return <div className="empty-message">{emptyMessage}</div>;
  }

  return (
    <>
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={texts.labels.searchPlaceholder}
        resultCount={filteredThreads.length}
        totalCount={threads.length}
      />
      {filteredThreads.length === 0 ? (
        <div className="empty-message">{emptyMessage}</div>
      ) : (
        <div className="thread-list">
          {filteredThreads.map((thread) => (
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
      )}
    </>
  );
});
