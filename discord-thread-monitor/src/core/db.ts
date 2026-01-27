import { openDB, type IDBPDatabase } from 'idb';
import { IDB } from '../constants';

export type AppDB = IDBPDatabase;

export function openAppDB(): Promise<AppDB> {
  return openDB(IDB.DB_NAME, IDB.DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore(IDB.DATA_STORE);
        db.createObjectStore(IDB.PREFS_STORE);
      }
    },
  });
}
