import { useState, useEffect, useRef, useCallback } from 'react';

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

const usePersistentPosition = (storageKey: string, defaultPosition: Position, bounds: Bounds) => {
  const [position, setPosition] = useState<Position>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return clampPosition(parsed, bounds);
        }
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
    return defaultPosition;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(position));
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
    if (!isDragging) return;

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
    [excludeSelector, setIsDragging, dragStartRef]
  );

  return {
    position,
    isDragging,
    handleMouseDown,
  };
}
