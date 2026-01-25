import { describe, it, expect } from 'vitest';
import { formatBytes } from './utils';

describe('formatBytes', () => {
  it('should format bytes less than 1024 correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(100)).toBe('100 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('should format bytes between 1024 and 1048576 correctly', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(1048575)).toBe('1024.0 KB');
  });

  it('should format bytes >= 1048576 correctly', () => {
    expect(formatBytes(1048576)).toBe('1.00 MB');
    expect(formatBytes(1572864)).toBe('1.50 MB');
    expect(formatBytes(2097152)).toBe('2.00 MB');
    expect(formatBytes(10485760)).toBe('10.00 MB');
  });

  it('should handle large values correctly', () => {
    expect(formatBytes(1073741824)).toBe('1024.00 MB'); // 1 GB
    expect(formatBytes(10737418240)).toBe('10240.00 MB'); // 10 GB
  });

  it('should handle edge cases around 1024 boundary', () => {
    expect(formatBytes(1023)).toBe('1023 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1025)).toBe('1.0 KB');
  });

  it('should handle edge cases around 1048576 boundary', () => {
    expect(formatBytes(1048575)).toBe('1024.0 KB');
    expect(formatBytes(1048576)).toBe('1.00 MB');
    expect(formatBytes(1048577)).toBe('1.00 MB');
  });

  it('should use correct decimal places for each unit', () => {
    // KB should have 1 decimal place
    expect(formatBytes(1126)).toBe('1.1 KB');

    // MB should have 2 decimal places
    expect(formatBytes(1153434)).toBe('1.10 MB');
    expect(formatBytes(1153434)).not.toBe('1.1 MB'); // Should have 2 decimal places
  });
});
