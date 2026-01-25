import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ScanIcon, CloseIcon, HelpIcon, ThreadIcon } from './Icons';

describe('Icons', () => {
  describe('ScanIcon', () => {
    it('should render SVG with correct viewBox and attributes', () => {
      const { container } = render(<ScanIcon />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 16 16');
      expect(svg).toHaveAttribute('fill', 'currentColor');
      expect(svg).toHaveAttribute('width', '14');
      expect(svg).toHaveAttribute('height', '14');
    });

    it('should contain SVG paths', () => {
      const { container } = render(<ScanIcon />);
      const paths = container.querySelectorAll('path');

      expect(paths.length).toBeGreaterThan(0);
    });
  });

  describe('CloseIcon', () => {
    it('should render SVG with correct viewBox and attributes', () => {
      const { container } = render(<CloseIcon />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg).toHaveAttribute('fill', 'none');
      expect(svg).toHaveAttribute('stroke', 'currentColor');
      expect(svg).toHaveAttribute('stroke-width', '2');
      expect(svg).toHaveAttribute('width', '18');
      expect(svg).toHaveAttribute('height', '18');
    });

    it('should contain SVG path with close icon', () => {
      const { container } = render(<CloseIcon />);
      const paths = container.querySelectorAll('path');

      expect(paths.length).toBe(1);
      expect(paths[0]).toHaveAttribute('d', 'M18 6L6 18M6 6l12 12');
    });
  });

  describe('HelpIcon', () => {
    it('should render SVG with correct viewBox and attributes', () => {
      const { container } = render(<HelpIcon />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg).toHaveAttribute('fill', 'currentColor');
      expect(svg).toHaveAttribute('width', '16');
      expect(svg).toHaveAttribute('height', '16');
    });

    it('should contain SVG path', () => {
      const { container } = render(<HelpIcon />);
      const paths = container.querySelectorAll('path');

      expect(paths.length).toBe(1);
    });
  });

  describe('ThreadIcon', () => {
    it('should render SVG with correct viewBox', () => {
      const { container } = render(<ThreadIcon />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg).toHaveAttribute('fill', 'currentColor');
    });

    it('should contain SVG paths', () => {
      const { container } = render(<ThreadIcon />);
      const paths = container.querySelectorAll('path');

      expect(paths.length).toBe(2);
    });
  });
});
