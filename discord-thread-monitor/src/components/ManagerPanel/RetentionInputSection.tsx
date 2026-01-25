import { type getTexts } from '../../i18n';
import { useRetentionInput } from './useRetentionInput';

interface RetentionInputSectionProps {
  retentionDays: number;
  onRetentionChange: (days: number) => void;
  t: ReturnType<typeof getTexts>;
}

export function RetentionInputSection({
  retentionDays,
  onRetentionChange,
  t,
}: RetentionInputSectionProps) {
  const { handleRetentionBlur, handleRetentionKeyDown, inputDisplayValue, setRetentionInput } =
    useRetentionInput(retentionDays, onRetentionChange);

  return (
    <div className="settings-group">
      <label>{t.settings.retentionPeriod}:</label>
      <div className="retention-input-group">
        <input
          type="text"
          value={inputDisplayValue}
          onChange={(e) => setRetentionInput(e.target.value)}
          onBlur={handleRetentionBlur}
          onKeyDown={handleRetentionKeyDown}
          className="retention-input"
          placeholder="0"
        />
        <span className="retention-unit">{t.settings.days}</span>
      </div>
      <span className="retention-hint">{t.settings.retentionHint}</span>
    </div>
  );
}
