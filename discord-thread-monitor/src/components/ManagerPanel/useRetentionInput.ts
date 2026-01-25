import { useState, useCallback } from 'react';
import { getTexts } from '../../i18n';

const PERMANENT_KEYWORDS = ['permanent', '永久'];
const MIN_RETENTION_DAYS = 0;
const MAX_RETENTION_DAYS = 365;

const isValidRetention = (days: number) =>
  !isNaN(days) && days >= MIN_RETENTION_DAYS && days <= MAX_RETENTION_DAYS;

interface ParseRetentionInputParams {
  input: string;
  formatDisplayValue: (days: number) => string;
  t: ReturnType<typeof getTexts>;
  retentionDays: number;
  onRetentionChange: (days: number) => void;
  setRetentionInput: (value: string) => void;
}

const parseRetentionInput = ({
  input,
  formatDisplayValue,
  t,
  retentionDays,
  onRetentionChange,
  setRetentionInput,
}: ParseRetentionInputParams) => {
  if (!input) {
    setRetentionInput(formatDisplayValue(retentionDays));
    return;
  }

  if (PERMANENT_KEYWORDS.some((keyword) => input.toLowerCase() === keyword)) {
    onRetentionChange(0);
    setRetentionInput(t.settings.permanent);
    return;
  }

  const days = parseInt(input, 10);
  if (isValidRetention(days)) {
    onRetentionChange(days);
    setRetentionInput(String(days));
  } else {
    setRetentionInput(formatDisplayValue(retentionDays));
  }
};

export const useRetentionInput = (
  retentionDays: number,
  onRetentionChange: (days: number) => void,
  t: ReturnType<typeof getTexts>
) => {
  const [retentionInput, setRetentionInput] = useState('');

  const formatDisplayValue = useCallback(
    (days: number) => (days === 0 ? t.settings.permanent : String(days)),
    [t.settings.permanent]
  );

  const handleRetentionBlur = useCallback(() => {
    parseRetentionInput({
      input: retentionInput.trim(),
      formatDisplayValue,
      t,
      retentionDays,
      onRetentionChange,
      setRetentionInput,
    });
  }, [retentionInput, retentionDays, onRetentionChange, formatDisplayValue, t]);

  const handleRetentionKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleRetentionBlur();
      }
    },
    [handleRetentionBlur]
  );

  const inputDisplayValue = retentionInput || formatDisplayValue(retentionDays);

  return {
    retentionInput,
    setRetentionInput,
    handleRetentionBlur,
    handleRetentionKeyDown,
    inputDisplayValue,
  };
};
