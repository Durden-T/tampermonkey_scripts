import { useState, useRef } from 'react';
import { ThreadIcon } from './Icons';
import { useDraggable } from '../hooks/useDraggable';

interface ToggleButtonProps {
  unseenCount: number;
  onClick: () => void;
}

const BUTTON_SIZE = 44;
const DRAG_THRESHOLD = 3;

const useButtonInteraction = (onClick: () => void) => {
  const [isHovered, setIsHovered] = useState(false);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDownWrapper = (e: React.MouseEvent) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e: React.MouseEvent) => {
    const pos = mouseDownPos.current;
    if (pos) {
      const deltaX = Math.abs(e.clientX - pos.x);
      const deltaY = Math.abs(e.clientY - pos.y);
      if (deltaX < DRAG_THRESHOLD && deltaY < DRAG_THRESHOLD) {
        onClick();
      }
      mouseDownPos.current = null;
    }
  };

  return {
    isHovered,
    setIsHovered,
    handleClick,
    handleMouseDownWrapper,
  };
};

export function ToggleButton({ unseenCount, onClick }: ToggleButtonProps) {
  const { isHovered, setIsHovered, handleClick, handleMouseDownWrapper } =
    useButtonInteraction(onClick);

  const { position, isDragging, handleMouseDown } = useDraggable({
    storageKey: 'thread-monitor-toggle-position',
    defaultPosition: {
      x: window.innerWidth - BUTTON_SIZE - 16,
      y: 16,
    },
    bounds: { width: BUTTON_SIZE, height: BUTTON_SIZE },
    excludeSelector: '.toggle-badge',
  });

  const handleMouseDownCombined = (e: React.MouseEvent) => {
    handleMouseDownWrapper(e);
    handleMouseDown(e);
  };

  return (
    <button
      className="thread-monitor-toggle"
      style={{
        opacity: unseenCount > 0 || isHovered ? 1 : 0.8,
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDownCombined}
      onClick={handleClick}
    >
      <span className="toggle-icon">
        <ThreadIcon />
      </span>
      {unseenCount > 0 && (
        <span className="toggle-badge pulse">{unseenCount > 99 ? '99+' : unseenCount}</span>
      )}
    </button>
  );
}
