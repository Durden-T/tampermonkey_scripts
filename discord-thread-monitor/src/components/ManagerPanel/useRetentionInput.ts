import { useState, useCallback } from 'react';

const MIN_RETENTION_DAYS = -1;

const isValidRetention = (days: number) => !isNaN(days) && days >= MIN_RETENTION_DAYS;

interface ParseRetentionInputParams {
  input: string;
  retentionDays: number;
  onRetentionChange: (days: number) => void;
  setRetentionInput: (value: string) => void;
}

const CLEAR_ALL_VALUE = -1;

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
  if (days === CLEAR_ALL_VALUE) {
    onRetentionChange(days);
    setRetentionInput('');
    return;
  }
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

  const handleRetentionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setRetentionInput(e.target.value);
  }, []);

  const handleRetentionKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        handleRetentionBlur();
      }
    },
    [handleRetentionBlur]
  );

  const inputDisplayValue = retentionInput || String(retentionDays);

  return {
    handleRetentionBlur,
    handleRetentionChange,
    handleRetentionKeyDown,
    inputDisplayValue,
    setRetentionInput,
  };
};
