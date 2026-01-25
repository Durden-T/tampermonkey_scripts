import { describe, it, expect, vi } from 'vitest';
import { Notifier } from './Notifier';
import type { TitleChange } from '../types';

describe('Notifier', () => {
  let notifier: Notifier;

  beforeEach(() => {
    notifier = new Notifier();
  });

  describe('onNotify', () => {
    it('should register a callback', () => {
      const callback = vi.fn();

      notifier.onNotify(callback);

      // Trigger notification
      const change: TitleChange = {
        threadId: '123',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 1000,
        seen: false,
      };

      notifier.notify(change);

      expect(callback).toHaveBeenCalledWith(change);
    });

    it('should register multiple callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      notifier.onNotify(callback1);
      notifier.onNotify(callback2);
      notifier.onNotify(callback3);

      const change: TitleChange = {
        threadId: '123',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 1000,
        seen: false,
      };

      notifier.notify(change);

      expect(callback1).toHaveBeenCalledWith(change);
      expect(callback2).toHaveBeenCalledWith(change);
      expect(callback3).toHaveBeenCalledWith(change);
    });

    it('should allow registering the same callback multiple times', () => {
      const callback = vi.fn();

      notifier.onNotify(callback);
      notifier.onNotify(callback);

      const change: TitleChange = {
        threadId: '123',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 1000,
        seen: false,
      };

      notifier.notify(change);

      // Callback should be called twice (once for each registration)
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(change);
    });
  });

  describe('offNotify', () => {
    it('should remove a registered callback', () => {
      const callback = vi.fn();

      notifier.onNotify(callback);
      notifier.offNotify(callback);

      const change: TitleChange = {
        threadId: '123',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 1000,
        seen: false,
      };

      notifier.notify(change);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should only remove the first occurrence of a callback', () => {
      const callback = vi.fn();

      // Register same callback twice
      notifier.onNotify(callback);
      notifier.onNotify(callback);

      // Remove one occurrence
      notifier.offNotify(callback);

      const change: TitleChange = {
        threadId: '123',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 1000,
        seen: false,
      };

      notifier.notify(change);

      // Should still be called once (the second registration)
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle removing non-existent callback', () => {
      const callback = vi.fn();
      const nonExistentCallback = vi.fn();

      notifier.onNotify(callback);
      notifier.offNotify(nonExistentCallback); // Should not throw

      const change: TitleChange = {
        threadId: '123',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 1000,
        seen: false,
      };

      notifier.notify(change);

      expect(callback).toHaveBeenCalledWith(change);
    });

    it('should handle removing callback when none are registered', () => {
      const callback = vi.fn();

      expect(() => notifier.offNotify(callback)).not.toThrow();
    });

    it('should handle removing all callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      notifier.onNotify(callback1);
      notifier.onNotify(callback2);
      notifier.onNotify(callback3);

      notifier.offNotify(callback1);
      notifier.offNotify(callback2);
      notifier.offNotify(callback3);

      const change: TitleChange = {
        threadId: '123',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 1000,
        seen: false,
      };

      notifier.notify(change);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
      expect(callback3).not.toHaveBeenCalled();
    });
  });

  describe('notify', () => {
    it('should call all registered callbacks with the change', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      notifier.onNotify(callback1);
      notifier.onNotify(callback2);
      notifier.onNotify(callback3);

      const change: TitleChange = {
        threadId: '123',
        oldTitle: 'Old Title',
        newTitle: 'New Title',
        changedAt: 1234567890,
        seen: false,
      };

      notifier.notify(change);

      expect(callback1).toHaveBeenCalledWith(change);
      expect(callback2).toHaveBeenCalledWith(change);
      expect(callback3).toHaveBeenCalledWith(change);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(1);
    });

    it('should not call any callbacks if none are registered', () => {
      const change: TitleChange = {
        threadId: '123',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 1000,
        seen: false,
      };

      expect(() => notifier.notify(change)).not.toThrow();
    });

    it('should handle callbacks that throw errors', () => {
      const normalCallback = vi.fn();
      const throwingCallback = vi.fn(() => {
        throw new Error('Callback error');
      });

      notifier.onNotify(normalCallback);
      notifier.onNotify(throwingCallback);

      const change: TitleChange = {
        threadId: '123',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 1000,
        seen: false,
      };

      // This will throw because of throwingCallback, but we want to verify it happens
      expect(() => notifier.notify(change)).toThrow('Callback error');

      // Normal callback should still have been called
      expect(normalCallback).toHaveBeenCalledWith(change);
    });

    it('should pass the exact same change object to all callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      notifier.onNotify(callback1);
      notifier.onNotify(callback2);

      const change: TitleChange = {
        threadId: '123',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 1000,
        seen: false,
      };

      notifier.notify(change);

      // Verify the exact same object reference is passed
      expect(callback1.mock.calls[0][0]).toBe(change);
      expect(callback2.mock.calls[0][0]).toBe(change);
    });
  });

  describe('notifyAll', () => {
    it('should call all callbacks for each change in the array', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      notifier.onNotify(callback1);
      notifier.onNotify(callback2);

      const changes: TitleChange[] = [
        {
          threadId: '123',
          oldTitle: 'Old 1',
          newTitle: 'New 1',
          changedAt: 1000,
          seen: false,
        },
        {
          threadId: '456',
          oldTitle: 'Old 2',
          newTitle: 'New 2',
          changedAt: 2000,
          seen: false,
        },
        {
          threadId: '789',
          oldTitle: 'Old 3',
          newTitle: 'New 3',
          changedAt: 3000,
          seen: false,
        },
      ];

      notifier.notifyAll(changes);

      // Each callback should be called 3 times (once per change)
      expect(callback1).toHaveBeenCalledTimes(3);
      expect(callback2).toHaveBeenCalledTimes(3);

      // Verify correct order and data
      expect(callback1).toHaveBeenNthCalledWith(1, changes[0]);
      expect(callback1).toHaveBeenNthCalledWith(2, changes[1]);
      expect(callback1).toHaveBeenNthCalledWith(3, changes[2]);

      expect(callback2).toHaveBeenNthCalledWith(1, changes[0]);
      expect(callback2).toHaveBeenNthCalledWith(2, changes[1]);
      expect(callback2).toHaveBeenNthCalledWith(3, changes[2]);
    });

    it('should handle empty array', () => {
      const callback = vi.fn();

      notifier.onNotify(callback);
      notifier.notifyAll([]);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle single change array', () => {
      const callback = vi.fn();

      notifier.onNotify(callback);

      const change: TitleChange = {
        threadId: '123',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 1000,
        seen: false,
      };

      notifier.notifyAll([change]);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(change);
    });

    it('should process changes in order', () => {
      const callOrder: number[] = [];

      const callback = vi.fn((change: TitleChange) => {
        callOrder.push(change.changedAt);
      });

      notifier.onNotify(callback);

      const changes: TitleChange[] = [
        { threadId: '1', oldTitle: 'A', newTitle: 'B', changedAt: 100, seen: false },
        { threadId: '2', oldTitle: 'C', newTitle: 'D', changedAt: 200, seen: false },
        { threadId: '3', oldTitle: 'E', newTitle: 'F', changedAt: 300, seen: false },
      ];

      notifier.notifyAll(changes);

      expect(callOrder).toEqual([100, 200, 300]);
    });

    it('should handle callbacks that remove themselves during notification', () => {
      const callback1 = vi.fn(() => {
        notifier.offNotify(callback1);
      });
      const callback2 = vi.fn();

      notifier.onNotify(callback1);
      notifier.onNotify(callback2);

      const changes: TitleChange[] = [
        { threadId: '1', oldTitle: 'A', newTitle: 'B', changedAt: 100, seen: false },
        { threadId: '2', oldTitle: 'C', newTitle: 'D', changedAt: 200, seen: false },
      ];

      notifier.notifyAll(changes);

      // Note: When callback1 runs and removes itself during the first change,
      // it affects the array that forEach is iterating over
      // So callback1 gets called once, and callback2 also gets called once
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should handle large number of changes', () => {
      const callback = vi.fn();
      notifier.onNotify(callback);

      const changes: TitleChange[] = [];
      for (let i = 0; i < 100; i++) {
        changes.push({
          threadId: `${i}`,
          oldTitle: `Old ${i}`,
          newTitle: `New ${i}`,
          changedAt: i,
          seen: false,
        });
      }

      notifier.notifyAll(changes);

      expect(callback).toHaveBeenCalledTimes(100);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complex notification workflow', () => {
      const notifications: TitleChange[] = [];

      const collectorCallback = vi.fn((change: TitleChange) => {
        notifications.push(change);
      });

      const countCallback = vi.fn();

      notifier.onNotify(collectorCallback);
      notifier.onNotify(countCallback);

      // Add some changes
      const changes: TitleChange[] = [
        { threadId: '1', oldTitle: 'A', newTitle: 'B', changedAt: 100, seen: false },
        { threadId: '2', oldTitle: 'C', newTitle: 'D', changedAt: 200, seen: false },
      ];

      notifier.notifyAll(changes);

      expect(notifications).toHaveLength(2);
      expect(notifications[0]).toEqual(changes[0]);
      expect(notifications[1]).toEqual(changes[1]);

      expect(countCallback).toHaveBeenCalledTimes(2);

      // Remove one callback and notify again
      notifier.offNotify(countCallback);

      const newChange: TitleChange = {
        threadId: '3',
        oldTitle: 'E',
        newTitle: 'F',
        changedAt: 300,
        seen: false,
      };

      notifier.notify(newChange);

      expect(notifications).toHaveLength(3);
      expect(notifications[2]).toEqual(newChange);

      expect(countCallback).toHaveBeenCalledTimes(2); // Should not have been called again
    });

    it('should handle multiple notifiers independently', () => {
      const notifier1 = new Notifier();
      const notifier2 = new Notifier();

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      notifier1.onNotify(callback1);
      notifier2.onNotify(callback2);

      const change: TitleChange = {
        threadId: '123',
        oldTitle: 'Old',
        newTitle: 'New',
        changedAt: 1000,
        seen: false,
      };

      notifier1.notify(change);

      expect(callback1).toHaveBeenCalledWith(change);
      expect(callback2).not.toHaveBeenCalled();

      notifier2.notify(change);

      expect(callback2).toHaveBeenCalledWith(change);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });
});
