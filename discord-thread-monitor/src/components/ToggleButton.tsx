import { useState, useRef } from 'react';
import { ThreadIcon } from './Icons';
import { useDraggable } from '../hooks/useDraggable';
import { UI, STORAGE } from '../constants';

interface ToggleButtonProps {
  unseenCount: number;
  onClick: () => void;
}

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
      if (deltaX < UI.DRAG_THRESHOLD_PX && deltaY < UI.DRAG_THRESHOLD_PX) {
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
    storageKey: STORAGE.TOGGLE_POSITION_KEY,
    defaultPosition: {
      x: window.innerWidth - UI.TOGGLE_BUTTON_SIZE - UI.TOGGLE_BUTTON_OFFSET,
      y: UI.TOGGLE_BUTTON_OFFSET,
    },
    bounds: { width: UI.TOGGLE_BUTTON_SIZE, height: UI.TOGGLE_BUTTON_SIZE },
    excludeSelector: '.toggle-badge',
  });

  const handleMouseDownCombined = (e: React.MouseEvent) => {
    handleMouseDownWrapper(e);
    handleMouseDown(e);
  };

  const displayCount =
    unseenCount > UI.TOGGLE_BADGE_MAX_DISPLAY ? `${UI.TOGGLE_BADGE_MAX_DISPLAY}+` : unseenCount;

  return (
    <button
      className="thread-monitor-toggle"
      aria-label="Thread Monitor"
      style={{
        opacity: unseenCount > 0 || isHovered ? 1 : UI.TOGGLE_BUTTON_DEFAULT_OPACITY,
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
      {unseenCount > 0 && <span className="toggle-badge pulse">{displayCount}</span>}
    </button>
  );
}
