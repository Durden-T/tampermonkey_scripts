import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToggleButton } from './ToggleButton';
import { useDraggable } from '../hooks/useDraggable';

vi.mock('../hooks/useDraggable');
vi.mock('./Icons', () => ({
  ThreadIcon: () => <div data-testid="thread-icon">ThreadIcon</div>,
}));

describe('ToggleButton', () => {
  const mockOnClick = vi.fn();
  const mockUseDraggable = useDraggable as Mock<typeof useDraggable>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnClick.mockClear();

    mockUseDraggable.mockReturnValue({
      position: { x: 100, y: 100 },
      isDragging: false,
      handleMouseDown: vi.fn(),
    });

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  describe('Badge display', () => {
    it('should display unseen count when greater than 0', () => {
      render(<ToggleButton unseenCount={5} onClick={mockOnClick} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should display 99+ when unseen count exceeds 99', () => {
      render(<ToggleButton unseenCount={150} onClick={mockOnClick} />);
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('should not display badge when unseen count is 0', () => {
      render(<ToggleButton unseenCount={0} onClick={mockOnClick} />);
      expect(screen.queryByText(/\d/)).not.toBeInTheDocument();
    });
  });

  describe('Click vs Drag behavior', () => {
    it('should call onClick when clicked without dragging', async () => {
      const user = userEvent.setup();
      render(<ToggleButton unseenCount={0} onClick={mockOnClick} />);
      const button = screen.getByRole('button');

      await user.click(button);
      expect(mockOnClick).toHaveBeenCalled();
    });

    it('should not call onClick when dragging occurred', () => {
      render(<ToggleButton unseenCount={0} onClick={mockOnClick} />);
      const button = screen.getByRole('button');

      fireEvent.mouseDown(button, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(button, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(button);

      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('Dragging state', () => {
    it('should update cursor style when dragging', () => {
      mockUseDraggable.mockReturnValue({
        position: { x: 100, y: 100 },
        isDragging: true,
        handleMouseDown: vi.fn(),
      });

      render(<ToggleButton unseenCount={0} onClick={mockOnClick} />);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ cursor: 'grabbing' });
    });

    it('should use default cursor when not dragging', () => {
      mockUseDraggable.mockReturnValue({
        position: { x: 100, y: 100 },
        isDragging: false,
        handleMouseDown: vi.fn(),
      });

      render(<ToggleButton unseenCount={0} onClick={mockOnClick} />);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ cursor: 'grab' });
    });
  });
});
