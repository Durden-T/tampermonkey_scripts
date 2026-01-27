export const TIME_MS = {
  MINUTE: 60_000,
  HOUR: 3_600_000,
  DAY: 86_400_000,
} as const;

export const BYTES = {
  KB: 1024,
  MB: 1_048_576,
} as const;

const WARNING_THRESHOLD_KB = 200;

export const DISCORD_URL_PREFIX = 'https://discord.com/channels/';

export const IDB = {
  DB_NAME: 'discord-thread-monitor',
  DB_VERSION: 1,
  DATA_STORE: 'data',
  PREFS_STORE: 'prefs',
  DATA_KEY: 'main',
} as const;

export const STORAGE = {
  WARNING_THRESHOLD: WARNING_THRESHOLD_KB * BYTES.KB,
  SAVE_DEBOUNCE_MS: 300,
  LANGUAGE_KEY: 'thread-monitor-language',
  HELP_SEEN_KEY: 'thread-monitor-help-seen',
  PANEL_POSITION_KEY: 'thread-monitor-panel-position',
  TOGGLE_POSITION_KEY: 'thread-monitor-toggle-position',
} as const;

export const TIME_UNITS = {
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  DAYS_PER_MONTH: 30,
  MONTHS_IN_QUARTER: 3,
  MONTHS_IN_HALF_YEAR: 6,
} as const;

export const UI = {
  TOGGLE_BUTTON_SIZE: 51,
  TOGGLE_BUTTON_OFFSET: 16,
  TOGGLE_BUTTON_DEFAULT_OPACITY: 0.8,
  TOGGLE_BADGE_MAX_DISPLAY: 99,
  DRAG_THRESHOLD_PX: 3,
  PANEL_WIDTH: 466,
  PANEL_MIN_HEIGHT: 212,
  PANEL_DEFAULT_X_OFFSET: 16,
  PANEL_DEFAULT_Y_POSITION: 80,
  SEGMENTED_CONTROL_PADDING: 3,
} as const;

export const TIMING = {
  INITIAL_SCAN_DELAY_MS: 2000,
  SCAN_INTERVAL_MS: 60_000,
  TOAST_AUTO_DISMISS_MS: 10_000,
  NAV_CHECK_INTERVAL_MS: 1000,
  NAV_SCAN_DELAY_MS: 1500,
  MIN_SCAN_GAP_MS: 3000,
  INITIAL_SCAN_MAX_RETRIES: 5,
} as const;

export const RETENTION = {
  MAX_DAYS: 365,
} as const;
