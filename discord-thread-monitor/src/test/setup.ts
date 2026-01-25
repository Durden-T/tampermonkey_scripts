import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';

class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

beforeEach(() => {
  const mockStorage = new LocalStorageMock();
  global.localStorage = mockStorage as Storage;

  // Suppress React act() warnings in tests since they're expected with timer-based updates
  const originalError = console.error;
  vi.spyOn(console, 'error').mockImplementation((...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) {
      return; // Suppress act() warnings
    }
    originalError(...args);
  });
});
