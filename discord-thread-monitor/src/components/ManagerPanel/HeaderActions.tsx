import { type getTexts } from '../../i18n';

interface HeaderActionsProps {
  unseenCount: number;
  changesLength: number;
  onMarkAllRead: () => void;
  onClearChanges: () => void;
  t: ReturnType<typeof getTexts>;
}

export const HeaderActions: React.FC<HeaderActionsProps> = ({
  unseenCount,
  changesLength,
  onMarkAllRead,
  onClearChanges,
  t,
}) => (
  <div className="filter-actions">
    {unseenCount > 0 && (
      <button className="mark-read-button" onClick={onMarkAllRead}>
        {t.actions.markAllRead}
      </button>
    )}
    {changesLength > 0 && (
      <button className="clear-button" onClick={onClearChanges}>
        {t.actions.clearChanges}
      </button>
    )}
  </div>
);
