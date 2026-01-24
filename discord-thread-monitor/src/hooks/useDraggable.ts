import { useState, useEffect, useRef, useCallback } from 'react';

export interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  storageKey: string;
  defaultPosition: Position;
  bounds: { width: number; height: number };
  excludeSelector?: string;
}

interface UseDraggableResult {
  position: Position;
  isDragging: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
}

function clampPosition(pos: Position, bounds: { width: number; height: number }): Position {
  return {
    x: Math.max(0, Math.min(window.innerWidth - bounds.width, pos.x)),
    y: Math.max(0, Math.min(window.innerHeight - bounds.height, pos.y)),
  };
}

export function useDraggable(options: UseDraggableOptions): UseDraggableResult {
  const { storageKey, defaultPosition, bounds, excludeSelector } = options;

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

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<Position>({ x: 0, y: 0 });

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

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStart.current.x;
      const deltaY = e.clientY - dragStart.current.y;

      setPosition((prev) => clampPosition({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }, bounds));

      dragStart.current = { x: e.clientX, y: e.clientY };
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
  }, [isDragging, bounds]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (excludeSelector && (e.target as HTMLElement).closest(excludeSelector)) {
      return;
    }
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
  }, [excludeSelector]);

  return {
    position,
    isDragging,
    handleMouseDown,
  };
}
