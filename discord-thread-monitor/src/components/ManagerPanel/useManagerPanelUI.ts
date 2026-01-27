import { useState, useEffect } from 'react';
import { getCurrentLanguage, setLanguage } from '../../i18n';
import { useDraggable } from '../../hooks/useDraggable';
import { UI, STORAGE } from '../../constants';
import { getPrefsStore } from '../../core/PrefsStore';

const usePanelPosition = () => {
  const { position, isDragging, handleMouseDown } = useDraggable({
    storageKey: STORAGE.PANEL_POSITION_KEY,
    defaultPosition: {
      x: window.innerWidth - UI.PANEL_WIDTH - UI.PANEL_DEFAULT_X_OFFSET,
      y: UI.PANEL_DEFAULT_Y_POSITION,
    },
    bounds: { width: UI.PANEL_WIDTH, height: UI.PANEL_MIN_HEIGHT },
    excludeSelector: '.panel-actions, .panel-tabs, .panel-content',
  });
  return { position, isDragging, handleMouseDown };
};

const useLanguageToggle = () => {
  const [language, setLanguageState] = useState<'zh' | 'en'>(getCurrentLanguage());

  const handleLanguageToggle = () => {
    const newLang = language === 'zh' ? 'en' : 'zh';
    setLanguage(newLang);
    setLanguageState(newLang);
  };

  return { language, handleLanguageToggle };
};

const useHelpVisibility = (isOpen: boolean) => {
  const [showHelp, setShowHelp] = useState(() => {
    try {
      return isOpen && !getPrefsStore().get<boolean>(STORAGE.HELP_SEEN_KEY);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (showHelp) {
      try {
        void getPrefsStore()
          .set(STORAGE.HELP_SEEN_KEY, true)
          .catch((error) => {
            console.error('Failed to persist help seen state:', error);
          });
      } catch (error) {
        if (error instanceof Error && !error.message.includes('not initialized')) {
          console.error('PrefsStore error:', error);
        }
      }
    }
  }, [showHelp]);

  return { showHelp, setShowHelp };
};

export const useManagerPanelUI = (isOpen: boolean) => {
  const { position, isDragging, handleMouseDown } = usePanelPosition();
  const { language, handleLanguageToggle } = useLanguageToggle();
  const { showHelp, setShowHelp } = useHelpVisibility(isOpen);

  return {
    position,
    isDragging,
    handleMouseDown,
    language,
    handleLanguageToggle,
    showHelp,
    setShowHelp,
  };
};
