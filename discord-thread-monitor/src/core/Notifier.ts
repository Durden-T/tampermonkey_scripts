import type { TitleChange } from '../types';

export interface NotificationCallback {
  (change: TitleChange): void;
}

export class Notifier {
  private callbacks: NotificationCallback[] = [];

  onNotify(callback: NotificationCallback): void {
    this.callbacks.push(callback);
  }

  offNotify(callback: NotificationCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  notify(change: TitleChange): void {
    this.callbacks.forEach((callback) => callback(change));
  }

  notifyAll(changes: TitleChange[]): void {
    changes.forEach((change) => this.notify(change));
  }
}
