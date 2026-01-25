import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  ScanIcon,
  CloseIcon,
  HelpIcon,
  ThreadIcon,
  UpdateIcon,
  ChevronIcon,
  EyeIcon,
  BlockIcon,
  CheckIcon,
  TrashIcon,
  ExternalLinkIcon,
  ResumeIcon,
} from './Icons';

describe('Icons', () => {
  describe('ScanIcon', () => {
    it('should render SVG with correct viewBox and attributes', () => {
      const { container } = render(<ScanIcon />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg).toHaveAttribute('fill', 'none');
      expect(svg).toHaveAttribute('stroke', 'currentColor');
      expect(svg).toHaveAttribute('width', '16');
      expect(svg).toHaveAttribute('height', '16');
    });

    it('should contain SVG paths', () => {
      const { container } = render(<ScanIcon />);
      const paths = container.querySelectorAll('path');

      expect(paths.length).toBe(2);
    });

    it('should accept custom size', () => {
      const { container } = render(<ScanIcon size={24} />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveAttribute('width', '24');
      expect(svg).toHaveAttribute('height', '24');
    });
  });

  describe('CloseIcon', () => {
    it('should render SVG with correct attributes', () => {
      const { container } = render(<CloseIcon />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg).toHaveAttribute('fill', 'none');
      expect(svg).toHaveAttribute('stroke', 'currentColor');
      expect(svg).toHaveAttribute('width', '16');
      expect(svg).toHaveAttribute('height', '16');
    });

    it('should contain two crossing paths', () => {
      const { container } = render(<CloseIcon />);
      const paths = container.querySelectorAll('path');

      expect(paths.length).toBe(2);
    });
  });

  describe('HelpIcon', () => {
    it('should render SVG with correct attributes', () => {
      const { container } = render(<HelpIcon />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg).toHaveAttribute('fill', 'none');
      expect(svg).toHaveAttribute('stroke', 'currentColor');
    });

    it('should contain circle and paths for question mark', () => {
      const { container } = render(<HelpIcon />);
      const circle = container.querySelector('circle');
      const paths = container.querySelectorAll('path');

      expect(circle).toBeInTheDocument();
      expect(paths.length).toBe(2);
    });
  });

  describe('ThreadIcon', () => {
    it('should render SVG with correct viewBox', () => {
      const { container } = render(<ThreadIcon />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg).toHaveAttribute('fill', 'none');
      expect(svg).toHaveAttribute('stroke', 'currentColor');
    });

    it('should contain multiple paths for document icon', () => {
      const { container } = render(<ThreadIcon />);
      const paths = container.querySelectorAll('path');

      expect(paths.length).toBe(4);
    });
  });

  describe('UpdateIcon', () => {
    it('should render SVG with correct attributes', () => {
      const { container } = render(<UpdateIcon />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg).toHaveAttribute('width', '16');
    });
  });

  describe('ChevronIcon', () => {
    it('should render with default rotation', () => {
      const { container } = render(<ChevronIcon />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveStyle({ transform: 'rotate(0deg)' });
    });

    it('should rotate when expanded', () => {
      const { container } = render(<ChevronIcon expanded />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveStyle({ transform: 'rotate(90deg)' });
    });
  });

  describe('EyeIcon', () => {
    it('should render eye shape with pupil', () => {
      const { container } = render(<EyeIcon />);
      const svg = container.querySelector('svg');
      const circle = container.querySelector('circle');
      const paths = container.querySelectorAll('path');

      expect(svg).toBeInTheDocument();
      expect(circle).toBeInTheDocument();
      expect(paths.length).toBe(1);
    });
  });

  describe('BlockIcon', () => {
    it('should render circle with diagonal line', () => {
      const { container } = render(<BlockIcon />);
      const circle = container.querySelector('circle');
      const paths = container.querySelectorAll('path');

      expect(circle).toBeInTheDocument();
      expect(paths.length).toBe(1);
    });
  });

  describe('CheckIcon', () => {
    it('should render checkmark path', () => {
      const { container } = render(<CheckIcon />);
      const paths = container.querySelectorAll('path');

      expect(paths.length).toBe(1);
    });
  });

  describe('TrashIcon', () => {
    it('should render trash can shape', () => {
      const { container } = render(<TrashIcon />);
      const paths = container.querySelectorAll('path');

      expect(paths.length).toBe(3);
    });
  });

  describe('ExternalLinkIcon', () => {
    it('should render arrow and frame', () => {
      const { container } = render(<ExternalLinkIcon />);
      const paths = container.querySelectorAll('path');

      expect(paths.length).toBe(3);
    });
  });

  describe('ResumeIcon', () => {
    it('should render refresh arrow shape', () => {
      const { container } = render(<ResumeIcon />);
      const paths = container.querySelectorAll('path');

      expect(paths.length).toBe(2);
    });
  });
});
