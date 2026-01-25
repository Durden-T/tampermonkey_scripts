import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { ThreadStore } from './core/ThreadStore';
import { Notifier } from './core/Notifier';
import type { MonitoredThread, TitleChange } from './types';

vi.mock('./components/ManagerPanel', () => ({
  ManagerPanel: ({ isOpen }: { isOpen: boolean }) => (
    <div data-testid="manager-panel">{isOpen ? 'Open' : 'Closed'}</div>
  ),
}));

vi.mock('./components/ToggleButton', () => ({
  ToggleButton: ({ unseenCount, onClick }: { unseenCount: number; onClick: () => void }) => (
    <button data-testid="toggle-button" onClick={onClick}>
      {unseenCount}
    </button>
  ),
}));

vi.mock('./components/ToastContainer', () => ({
  ToastContainer: () => <div data-testid="toast-container">Toast</div>,
}));

describe('App', () => {
  let store: ThreadStore;
  let notifier: Notifier;
  let performScan: ReturnType<typeof vi.fn>;

  const mockThread: MonitoredThread = {
    threadId: 'thread-1',
    title: 'Test Thread',
    url: 'https://discord.com/channels/123/456',
    firstSeen: Date.now(),
    lastSeen: Date.now(),
    parentChannelId: 'channel-1',
    parentChannelName: 'Test Channel',
  };

  const mockChange: TitleChange = {
    threadId: 'thread-1',
    oldTitle: 'Old Title',
    newTitle: 'New Title',
    timestamp: Date.now(),
    url: 'https://discord.com/channels/123/456',
    seen: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    global.GM_getValue = vi.fn().mockReturnValue(null);
    global.GM_setValue = vi.fn();

    store = new ThreadStore();
    notifier = new Notifier();
    performScan = vi.fn().mockReturnValue({
      currentThreads: [mockThread],
      changes: [],
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should render ToggleButton', () => {
      render(<App store={store} notifier={notifier} performScan={performScan} />);

      expect(screen.getByTestId('toggle-button')).toBeInTheDocument();
    });

    it('should render ManagerPanel', () => {
      render(<App store={store} notifier={notifier} performScan={performScan} />);

      expect(screen.getByTestId('manager-panel')).toBeInTheDocument();
    });

    it('should render ToastContainer', () => {
      render(<App store={store} notifier={notifier} performScan={performScan} />);

      expect(screen.getByTestId('toast-container')).toBeInTheDocument();
    });

    it('should initialize with unseen count from store', () => {
      vi.spyOn(store, 'getUnseenChangesCount').mockReturnValue(5);

      render(<App store={store} notifier={notifier} performScan={performScan} />);

      expect(screen.getByTestId('toggle-button')).toHaveTextContent('5');
    });

    it('should initialize with zero unseen count when no changes', () => {
      vi.spyOn(store, 'getUnseenChangesCount').mockReturnValue(0);

      render(<App store={store} notifier={notifier} performScan={performScan} />);

      expect(screen.getByTestId('toggle-button')).toHaveTextContent('0');
    });

    it('should call refreshData on mount', () => {
      const getUnseenChangesCountSpy = vi.spyOn(store, 'getUnseenChangesCount').mockReturnValue(0);
      const getChangesGroupedByThreadSpy = vi
        .spyOn(store, 'getChangesGroupedByThread')
        .mockReturnValue([]);
      const getStorageInfoSpy = vi.spyOn(store, 'getStorageInfo').mockReturnValue({
        rawSize: 0,
        compressedSize: 0,
        isCompressed: false,
        changeCount: 0,
        threadCount: 0,
      });

      render(<App store={store} notifier={notifier} performScan={performScan} />);

      expect(getUnseenChangesCountSpy).toHaveBeenCalled();
      expect(getChangesGroupedByThreadSpy).toHaveBeenCalled();
      expect(getStorageInfoSpy).toHaveBeenCalled();
    });
  });

  describe('Event Listener Attachment', () => {
    it('should attach notifier callback on mount', () => {
      const onNotifySpy = vi.spyOn(notifier, 'onNotify');

      render(<App store={store} notifier={notifier} performScan={performScan} />);

      expect(onNotifySpy).toHaveBeenCalled();
      expect(onNotifySpy).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should detach notifier callback on unmount', () => {
      const offNotifySpy = vi.spyOn(notifier, 'offNotify');

      const { unmount } = render(
        <App store={store} notifier={notifier} performScan={performScan} />
      );

      unmount();

      expect(offNotifySpy).toHaveBeenCalled();
      expect(offNotifySpy).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle notifier callback triggering state updates', async () => {
      const getUnseenCountSpy = vi.spyOn(store, 'getUnseenChangesCount');
      getUnseenCountSpy.mockReturnValue(0);

      render(<App store={store} notifier={notifier} performScan={performScan} />);

      expect(screen.getByTestId('toggle-button')).toHaveTextContent('0');

      getUnseenCountSpy.mockReturnValue(1);

      await act(async () => {
        notifier.notifyAll([mockChange]);
        return Promise.resolve();
      });

      expect(screen.getByTestId('toggle-button')).toHaveTextContent('1');
    });
  });

  describe('Scan Setup', () => {
    it('should setup scan interval on mount', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      render(<App store={store} notifier={notifier} performScan={performScan} />);

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);
    });

    it('should clear scan interval on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { unmount } = render(
        <App store={store} notifier={notifier} performScan={performScan} />
      );

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should call performScan when interval fires', () => {
      render(<App store={store} notifier={notifier} performScan={performScan} />);

      expect(performScan).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(60000);
      });

      expect(performScan).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(60000);
      });

      expect(performScan).toHaveBeenCalledTimes(2);
    });

    it('should refresh data after interval scan', () => {
      const getUnseenChangesCountSpy = vi.spyOn(store, 'getUnseenChangesCount').mockReturnValue(0);

      render(<App store={store} notifier={notifier} performScan={performScan} />);

      getUnseenChangesCountSpy.mockClear();

      act(() => {
        vi.advanceTimersByTime(60000);
      });

      expect(getUnseenChangesCountSpy).toHaveBeenCalled();
    });
  });

  describe('Panel Toggle', () => {
    it('should start with panel closed', () => {
      render(<App store={store} notifier={notifier} performScan={performScan} />);

      expect(screen.getByTestId('manager-panel')).toHaveTextContent('Closed');
    });

    it('should open panel when toggle button clicked', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();

      render(<App store={store} notifier={notifier} performScan={performScan} />);

      await user.click(screen.getByTestId('toggle-button'));

      expect(screen.getByTestId('manager-panel')).toHaveTextContent('Open');
    });

    it('should close panel when toggle button clicked twice', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();

      render(<App store={store} notifier={notifier} performScan={performScan} />);

      await user.click(screen.getByTestId('toggle-button'));
      expect(screen.getByTestId('manager-panel')).toHaveTextContent('Open');

      await user.click(screen.getByTestId('toggle-button'));
      expect(screen.getByTestId('manager-panel')).toHaveTextContent('Closed');
    });
  });
});
