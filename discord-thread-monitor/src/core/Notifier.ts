import type { TitleChange } from '../types';

export interface NotificationCallback {
  (change: TitleChange): void;
}

export class Notifier {
  private callbacks: Set<NotificationCallback> = new Set();

  onNotify(callback: NotificationCallback): void {
    this.callbacks.add(callback);
  }

  offNotify(callback: NotificationCallback): void {
    this.callbacks.delete(callback);
  }

  notify(change: TitleChange): void {
    this.callbacks.forEach((callback) => callback(change));
  }

  notifyAll(changes: TitleChange[]): void {
    changes.forEach((change) => this.notify(change));
  }
}
