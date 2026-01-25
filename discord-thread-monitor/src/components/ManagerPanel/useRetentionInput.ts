import { useState, useCallback } from 'react';

const MIN_RETENTION_DAYS = 0;

const isValidRetention = (days: number) => !isNaN(days) && days >= MIN_RETENTION_DAYS;

interface ParseRetentionInputParams {
  input: string;
  retentionDays: number;
  onRetentionChange: (days: number) => void;
  setRetentionInput: (value: string) => void;
}

const parseRetentionInput = ({
  input,
  retentionDays,
  onRetentionChange,
  setRetentionInput,
}: ParseRetentionInputParams) => {
  if (!input) {
    setRetentionInput(String(retentionDays));
    return;
  }

  const days = parseInt(input, 10);
  if (isValidRetention(days)) {
    onRetentionChange(days);
    setRetentionInput(String(days));
  } else {
    setRetentionInput(String(retentionDays));
  }
};

export const useRetentionInput = (
  retentionDays: number,
  onRetentionChange: (days: number) => void
) => {
  const [retentionInput, setRetentionInput] = useState('');

  const handleRetentionBlur = useCallback(() => {
    parseRetentionInput({
      input: retentionInput.trim(),
      retentionDays,
      onRetentionChange,
      setRetentionInput,
    });
  }, [retentionInput, retentionDays, onRetentionChange]);

  const handleRetentionKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleRetentionBlur();
      }
    },
    [handleRetentionBlur]
  );

  const inputDisplayValue = retentionInput || String(retentionDays);

  return {
    retentionInput,
    setRetentionInput,
    handleRetentionBlur,
    handleRetentionKeyDown,
    inputDisplayValue,
  };
};
