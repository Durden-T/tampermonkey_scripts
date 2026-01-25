import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDraggable } from './useDraggable';

describe('useDraggable', () => {
  let mockLocalStorage: Map<string, string>;
  let originalInnerWidth: number;
  let originalInnerHeight: number;

  beforeEach(() => {
    mockLocalStorage = new Map();
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;

    // Mock localStorage
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (
      this: Storage,
      key: string
    ) {
      return mockLocalStorage.get(key) || null;
    });

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ) {
      mockLocalStorage.set(key, value);
    });

    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (
      this: Storage,
      key: string
    ) {
      mockLocalStorage.delete(key);
    });

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    });

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 600,
    });

    // Mock addEventListener and removeEventListener
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
    document.addEventListener = vi.fn();
    document.removeEventListener = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth });
    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight });
  });

  describe('Initialization', () => {
    it('should use default position when no saved position exists', () => {
      const defaultPosition = { x: 100, y: 200 };
      const { result } = renderHook(() =>
        useDraggable({
          storageKey: 'test-storage',
          defaultPosition,
          bounds: { width: 50, height: 50 },
        })
      );

      expect(result.current.position).toEqual(defaultPosition);
    });

    it('should load saved position from localStorage', () => {
      const savedPosition = { x: 150, y: 250 };
      mockLocalStorage.set('test-storage', JSON.stringify(savedPosition));

      renderHook(() =>
        useDraggable({
          storageKey: 'test-storage',
          defaultPosition: { x: 100, y: 200 },
          bounds: { width: 50, height: 50 },
        })
      );

      // Position should be loaded from storage (may be clamped to bounds)
      expect(mockLocalStorage.get('test-storage')).toBeDefined();
    });

    it('should use default position when localStorage contains invalid data', () => {
      mockLocalStorage.set('test-storage', 'invalid json');

      const defaultPosition = { x: 100, y: 200 };
      const { result } = renderHook(() =>
        useDraggable({
          storageKey: 'test-storage',
          defaultPosition,
          bounds: { width: 50, height: 50 },
        })
      );

      expect(result.current.position).toEqual(defaultPosition);
    });

    it('should use default position when saved position has missing coordinates', () => {
      mockLocalStorage.set('test-storage', JSON.stringify({ x: 150 })); // missing y

      const defaultPosition = { x: 100, y: 200 };
      const { result } = renderHook(() =>
        useDraggable({
          storageKey: 'test-storage',
          defaultPosition,
          bounds: { width: 50, height: 50 },
        })
      );

      expect(result.current.position).toEqual(defaultPosition);
    });

    it('should clamp saved position to bounds', () => {
      // Position outside bounds (x > window.innerWidth - bounds.width)
      const savedPosition = { x: 1000, y: 500 };
      mockLocalStorage.set('test-storage', JSON.stringify(savedPosition));

      const { result } = renderHook(() =>
        useDraggable({
          storageKey: 'test-storage',
          defaultPosition: { x: 100, y: 200 },
          bounds: { width: 50, height: 50 },
        })
      );

      // Should be clamped to valid range: x <= 800 - 50 = 750, y <= 600 - 50 = 550
      expect(result.current.position.x).toBeLessThanOrEqual(750);
      expect(result.current.position.y).toBeLessThanOrEqual(550);
    });
  });

  describe('Dragging behavior', () => {
    it('should start dragging on mouse down', () => {
      const { result } = renderHook(() =>
        useDraggable({
          storageKey: 'test-storage',
          defaultPosition: { x: 100, y: 200 },
          bounds: { width: 50, height: 50 },
        })
      );

      const mockEvent = {
        clientX: 150,
        clientY: 250,
        target: document.createElement('div'),
      } as React.MouseEvent;

      act(() => {
        result.current.handleMouseDown(mockEvent);
      });

      expect(result.current.isDragging).toBe(true);
    });
  });

  describe('Bounds clamping', () => {
    it('should clamp position to stay within window bounds', () => {
      const { result } = renderHook(() =>
        useDraggable({
          storageKey: 'test-storage',
          defaultPosition: { x: 0, y: 0 },
          bounds: { width: 50, height: 50 },
        })
      );

      // Start dragging from near the edge
      const mockMouseDownEvent = {
        clientX: 0,
        clientY: 0,
        target: document.createElement('div'),
      } as React.MouseEvent;

      act(() => {
        result.current.handleMouseDown(mockMouseDownEvent);
      });

      // Try to move beyond left/top bounds
      const mouseMoveHandler = (window.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'mousemove'
      )?.[1];

      if (mouseMoveHandler) {
        act(() => {
          mouseMoveHandler({ clientX: -10, clientY: -10 } as MouseEvent);
        });
      }

      // Position should be clamped to >= 0
      expect(result.current.position.x).toBeGreaterThanOrEqual(0);
      expect(result.current.position.y).toBeGreaterThanOrEqual(0);
    });

    it('should clamp position to stay within right and bottom bounds', () => {
      const { result } = renderHook(() =>
        useDraggable({
          storageKey: 'test-storage',
          defaultPosition: { x: 750, y: 550 },
          bounds: { width: 50, height: 50 },
        })
      );

      // Position should be clamped: x <= 800 - 50 = 750, y <= 600 - 50 = 550
      expect(result.current.position.x).toBeLessThanOrEqual(750);
      expect(result.current.position.y).toBeLessThanOrEqual(550);
    });
  });

  describe('Exclude selector', () => {
    it('should not start dragging when target matches exclude selector', () => {
      const { result } = renderHook(() =>
        useDraggable({
          storageKey: 'test-storage',
          defaultPosition: { x: 100, y: 200 },
          bounds: { width: 50, height: 50 },
          excludeSelector: '.exclude-me',
        })
      );

      const excludedElement = document.createElement('div');
      excludedElement.className = 'exclude-me';

      // Mock closest to return the excluded element
      const mockClosest = vi.fn().mockReturnValue(excludedElement);
      excludedElement.closest = mockClosest;

      const mockEvent = {
        clientX: 150,
        clientY: 250,
        target: excludedElement,
      } as React.MouseEvent;

      act(() => {
        result.current.handleMouseDown(mockEvent);
      });

      expect(result.current.isDragging).toBe(false);
      expect(mockClosest).toHaveBeenCalledWith('.exclude-me');
    });

    it('should start dragging when target does not match exclude selector', () => {
      const { result } = renderHook(() =>
        useDraggable({
          storageKey: 'test-storage',
          defaultPosition: { x: 100, y: 200 },
          bounds: { width: 50, height: 50 },
          excludeSelector: '.exclude-me',
        })
      );

      const includedElement = document.createElement('div');
      includedElement.className = 'include-me';

      // Mock closest to return null (no excluded parent)
      includedElement.closest = vi.fn().mockReturnValue(null);

      const mockEvent = {
        clientX: 150,
        clientY: 250,
        target: includedElement,
      } as React.MouseEvent;

      act(() => {
        result.current.handleMouseDown(mockEvent);
      });

      expect(result.current.isDragging).toBe(true);
    });
  });

  describe('Window resize', () => {
    it('should clamp position when window is resized', () => {
      const { result } = renderHook(() =>
        useDraggable({
          storageKey: 'test-storage',
          defaultPosition: { x: 750, y: 550 },
          bounds: { width: 50, height: 50 },
        })
      );

      // Initially position might be valid
      expect(result.current.position.x).toBeLessThanOrEqual(750);

      // Resize window to be smaller
      Object.defineProperty(window, 'innerWidth', { value: 400 });
      Object.defineProperty(window, 'innerHeight', { value: 300 });

      // Trigger resize event
      const resizeHandler = (window.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'resize'
      )?.[1];

      if (resizeHandler) {
        act(() => {
          resizeHandler();
        });
      }

      // Position should be clamped to new smaller bounds
      expect(result.current.position.x).toBeLessThanOrEqual(350); // 400 - 50
      expect(result.current.position.y).toBeLessThanOrEqual(250); // 300 - 50
    });
  });

  describe('Event listener cleanup', () => {
    it('should cleanup event listeners when isDragging changes', () => {
      const { result, unmount } = renderHook(() =>
        useDraggable({
          storageKey: 'test-storage',
          defaultPosition: { x: 100, y: 200 },
          bounds: { width: 50, height: 50 },
        })
      );

      // Start dragging
      const mockEvent = {
        clientX: 150,
        clientY: 250,
        target: document.createElement('div'),
      } as React.MouseEvent;

      act(() => {
        result.current.handleMouseDown(mockEvent);
      });

      // Unmount component
      unmount();

      // Check that removeEventListener was called
      expect(document.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(document.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    });

    it('should cleanup window resize listener on unmount', () => {
      const { unmount } = renderHook(() =>
        useDraggable({
          storageKey: 'test-storage',
          defaultPosition: { x: 100, y: 200 },
          bounds: { width: 50, height: 50 },
        })
      );

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });
});
