import { type getTexts } from '../../i18n';

interface DebugActionsProps {
  onSimulateTitleChange: () => void;
  onClearChanges: () => void;
  t: ReturnType<typeof getTexts>;
}

export function DebugActions({ onSimulateTitleChange, onClearChanges, t }: DebugActionsProps) {
  return (
    <>
      <button onClick={onSimulateTitleChange}>{t.debug.simulateChange}</button>
      <button className="danger" onClick={onClearChanges}>
        {t.debug.clearAll}
      </button>
    </>
  );
}
