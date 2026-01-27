import { IDB } from '../constants';
import type { AppDB } from './db';

export class PrefsStore {
  private cache = new Map<string, unknown>();
  private db: AppDB;

  private constructor(db: AppDB) {
    this.db = db;
  }

  static async create(db: AppDB): Promise<PrefsStore> {
    const store = new PrefsStore(db);
    const tx = db.transaction(IDB.PREFS_STORE, 'readonly');
    try {
      let cursor = await tx.store.openCursor();
      while (cursor) {
        store.cache.set(cursor.key as string, cursor.value);
        cursor = await cursor.continue();
      }
      await tx.done;
    } catch (error) {
      tx.abort();
      console.error('Failed to initialize PrefsStore:', error);
      throw error;
    }
    return store;
  }

  get<T>(key: string): T | null {
    const val = this.cache.get(key);
    return val === undefined ? null : (val as T);
  }

  async set(key: string, value: unknown): Promise<void> {
    this.cache.set(key, value);
    await this.db.put(IDB.PREFS_STORE, value, key);
  }

  async remove(key: string): Promise<void> {
    this.cache.delete(key);
    await this.db.delete(IDB.PREFS_STORE, key);
  }
}

let instance: PrefsStore | null = null;

export function getPrefsStore(): PrefsStore {
  if (!instance) {
    throw new Error('PrefsStore not initialized. Call initPrefsStore() first.');
  }
  return instance;
}

export async function initPrefsStore(db: AppDB): Promise<PrefsStore> {
  instance = await PrefsStore.create(db);
  return instance;
}

export function resetPrefsStore(): void {
  instance = null;
}
