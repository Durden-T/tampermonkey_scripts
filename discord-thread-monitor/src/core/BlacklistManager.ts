export class BlacklistManager {
  private blacklistSet: Set<string>;

  constructor(initialBlacklist: string[]) {
    this.blacklistSet = new Set(initialBlacklist);
  }

  add(threadId: string): boolean {
    if (this.blacklistSet.has(threadId)) {
      return false;
    }
    this.blacklistSet.add(threadId);
    return true;
  }

  remove(threadId: string): boolean {
    return this.blacklistSet.delete(threadId);
  }

  has(threadId: string): boolean {
    return this.blacklistSet.has(threadId);
  }

  getAll(): string[] {
    return Array.from(this.blacklistSet);
  }
}
