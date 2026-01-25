import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

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
});
