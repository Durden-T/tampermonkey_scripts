import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToggleButton } from './ToggleButton';
import { useDraggable } from '../hooks/useDraggable';

// Mock the useDraggable hook
vi.mock('../hooks/useDraggable');

// Mock the Icons component
vi.mock('./Icons', () => ({
  ThreadIcon: () => <div data-testid="thread-icon">ThreadIcon</div>,
}));

describe('ToggleButton', () => {
  const mockOnClick = vi.fn();
  const mockUseDraggable = useDraggable as Mock<typeof useDraggable>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnClick.mockClear();

    // Default mock implementation
    mockUseDraggable.mockReturnValue({
      position: { x: 100, y: 100 },
      isDragging: false,
      handleMouseDown: vi.fn(),
    });

    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  it('should render with ThreadIcon', () => {
    render(<ToggleButton unseenCount={0} onClick={mockOnClick} />);

    expect(screen.getByTestId('thread-icon')).toBeInTheDocument();
  });

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

  it('should have correct default position based on window width', () => {
    // Update window width for this test
    Object.defineProperty(window, 'innerWidth', {
      value: 800,
    });

    // Mock useDraggable to return position based on the new window width
    mockUseDraggable.mockReturnValue({
      position: { x: 740, y: 16 }, // 800 - 44 - 16
      isDragging: false,
      handleMouseDown: vi.fn(),
    });

    render(<ToggleButton unseenCount={0} onClick={mockOnClick} />);

    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      left: '740px', // 800 - 44 - 16
      top: '16px',
    });
  });

  it('should call onClick when clicked without dragging', async () => {
    const user = userEvent.setup();

    render(<ToggleButton unseenCount={0} onClick={mockOnClick} />);

    const button = screen.getByRole('button');

    // Click without moving (should trigger onClick)
    await user.click(button);

    expect(mockOnClick).toHaveBeenCalled();
  });

  it('should not call onClick when dragging occurred', () => {
    render(<ToggleButton unseenCount={0} onClick={mockOnClick} />);

    const button = screen.getByRole('button');

    // Simulate mouse down, move, then up (dragging)
    fireEvent.mouseDown(button, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(button, { clientX: 150, clientY: 150 });
    fireEvent.mouseUp(button);

    // Click should not be called since we dragged
    expect(mockOnClick).not.toHaveBeenCalled();
  });

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

  it('should have higher opacity when hovered', async () => {
    const user = userEvent.setup();

    render(<ToggleButton unseenCount={0} onClick={mockOnClick} />);

    const button = screen.getByRole('button');

    // Initial opacity should be 0.8 (not hovered, no unseen count)
    expect(button).toHaveStyle({ opacity: 0.8 });

    // Hover over button
    await user.hover(button);

    // Opacity should be 1 when hovered
    await waitFor(() => {
      expect(button).toHaveStyle({ opacity: 1 });
    });
  });

  it('should have full opacity when there are unseen counts regardless of hover', () => {
    render(<ToggleButton unseenCount={5} onClick={mockOnClick} />);

    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ opacity: 1 });
  });

  it('should pass correct parameters to useDraggable hook', () => {
    render(<ToggleButton unseenCount={0} onClick={mockOnClick} />);

    expect(mockUseDraggable).toHaveBeenCalledWith({
      storageKey: 'thread-monitor-toggle-position',
      defaultPosition: { x: 1024 - 44 - 16, y: 16 }, // window.innerWidth - BUTTON_SIZE - 16
      bounds: { width: 44, height: 44 },
      excludeSelector: '.toggle-badge',
    });
  });

  it('should handle mouse down event and pass to draggable hook', () => {
    const mockHandleMouseDown = vi.fn();
    mockUseDraggable.mockReturnValue({
      position: { x: 100, y: 100 },
      isDragging: false,
      handleMouseDown: mockHandleMouseDown,
    });

    render(<ToggleButton unseenCount={0} onClick={mockOnClick} />);

    const button = screen.getByRole('button');
    fireEvent.mouseDown(button, { clientX: 100, clientY: 100 });

    expect(mockHandleMouseDown).toHaveBeenCalled();
  });

  it('should apply pulse class to badge', () => {
    render(<ToggleButton unseenCount={5} onClick={mockOnClick} />);

    const badge = screen.getByText('5');
    expect(badge).toHaveClass('pulse');
  });

  it('should apply correct className to button', () => {
    render(<ToggleButton unseenCount={0} onClick={mockOnClick} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('thread-monitor-toggle');
  });

  it('should apply correct className to icon container', () => {
    render(<ToggleButton unseenCount={0} onClick={mockOnClick} />);

    const iconContainer = screen.getByTestId('thread-icon').parentElement;
    expect(iconContainer).toHaveClass('toggle-icon');
  });

  describe('Window resize behavior', () => {
    it('should maintain position within bounds after window resize', () => {
      // Set initial window size
      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
        configurable: true,
      });

      // Mock useDraggable to return a position that would be valid for initial window
      mockUseDraggable.mockReturnValue({
        position: { x: 964, y: 16 }, // 1024 - 44 - 16
        isDragging: false,
        handleMouseDown: vi.fn(),
      });

      render(<ToggleButton unseenCount={0} onClick={mockOnClick} />);

      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        left: '964px',
        top: '16px',
      });
    });
  });
});
