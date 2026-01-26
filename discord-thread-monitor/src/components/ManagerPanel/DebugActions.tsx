import { type getTexts } from '../../i18n';

interface DebugActionsProps {
  onSimulateTitleChange: () => void;
  onClearChanges: () => void;
  onForceStorageWarning: () => void;
  t: ReturnType<typeof getTexts>;
}

export function DebugActions({
  onSimulateTitleChange,
  onClearChanges,
  onForceStorageWarning,
  t,
}: DebugActionsProps) {
  return (
    <>
      <button onClick={onSimulateTitleChange}>{t.debug.simulateChange}</button>
      <button onClick={onForceStorageWarning}>{t.debug.forceStorageWarning}</button>
      <button className="danger" onClick={onClearChanges}>
        {t.debug.clearAll}
      </button>
    </>
  );
}
