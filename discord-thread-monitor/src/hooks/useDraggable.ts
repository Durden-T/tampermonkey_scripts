import { useState, useEffect, useRef, useCallback } from 'react';
import { getPrefsStore } from '../core/PrefsStore';

export interface Position {
  x: number;
  y: number;
}

interface Bounds {
  width: number;
  height: number;
}

interface UseDraggableOptions {
  storageKey: string;
  defaultPosition: Position;
  bounds: Bounds;
  excludeSelector?: string;
}

interface UseDraggableResult {
  position: Position;
  isDragging: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
}

const clampPosition = (pos: Position, bounds: Bounds): Position => ({
  x: Math.max(0, Math.min(window.innerWidth - bounds.width, pos.x)),
  y: Math.max(0, Math.min(window.innerHeight - bounds.height, pos.y)),
});

const POSITION_SAVE_DEBOUNCE_MS = 300;

const loadInitialPosition = (
  storageKey: string,
  defaultPosition: Position,
  bounds: Bounds
): Position => {
  try {
    const saved = getPrefsStore().get<Position>(storageKey);
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
      return clampPosition(saved, bounds);
    }
  } catch (error) {
    if (error instanceof Error && !error.message.includes('not initialized')) {
      try {
        void getPrefsStore()
          .remove(storageKey)
          .catch((err) => {
            console.error('Failed to remove corrupted position:', err);
          });
      } catch {
        // PrefsStore not initialized yet
      }
    }
  }
  return defaultPosition;
};

const persistPosition = (storageKey: string, position: Position): void => {
  try {
    void getPrefsStore()
      .set(storageKey, position)
      .catch((error) => {
        console.error('Failed to persist position:', error);
      });
  } catch (error) {
    if (error instanceof Error && !error.message.includes('not initialized')) {
      console.error('PrefsStore error:', error);
    }
  }
};

const usePersistentPosition = (storageKey: string, defaultPosition: Position, bounds: Bounds) => {
  const [position, setPosition] = useState<Position>(() =>
    loadInitialPosition(storageKey, defaultPosition, bounds)
  );

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      persistPosition(storageKey, position);
      saveTimeoutRef.current = null;
    }, POSITION_SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        persistPosition(storageKey, position);
      }
    };
  }, [position, storageKey]);

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => clampPosition(prev, bounds));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [bounds]);

  return [position, setPosition] as const;
};

const useDragState = (
  bounds: Bounds,
  setPosition: React.Dispatch<React.SetStateAction<Position>>
) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<Position>({ x: 0, y: 0 });

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      setPosition((prev) =>
        clampPosition(
          {
            x: prev.x + deltaX,
            y: prev.y + deltaY,
          },
          bounds
        )
      );

      dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, bounds, setPosition]);

  return { isDragging, setIsDragging, dragStartRef };
};

export function useDraggable(options: UseDraggableOptions): UseDraggableResult {
  const { storageKey, defaultPosition, bounds, excludeSelector } = options;

  const [position, setPosition] = usePersistentPosition(storageKey, defaultPosition, bounds);
  const { isDragging, setIsDragging, dragStartRef } = useDragState(bounds, setPosition);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (excludeSelector && (e.target as HTMLElement).closest(excludeSelector)) {
        return;
      }
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    },
    // Refs are stable and don't need to be in dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [excludeSelector, setIsDragging]
  );

  return {
    position,
    isDragging,
    handleMouseDown,
  };
}
