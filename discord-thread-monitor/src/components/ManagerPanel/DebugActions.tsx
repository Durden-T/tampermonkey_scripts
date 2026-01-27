import { type getTexts } from '../../i18n';

interface DebugActionsProps {
  onSimulateTitleChange: () => void;
  onForceStorageWarning: () => void;
  t: ReturnType<typeof getTexts>;
}

export function DebugActions({
  onSimulateTitleChange,
  onForceStorageWarning,
  t,
}: DebugActionsProps) {
  return (
    <>
      <button onClick={onSimulateTitleChange}>{t.debug.simulateChange}</button>
      <button onClick={onForceStorageWarning}>{t.debug.forceStorageWarning}</button>
    </>
  );
}
