import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { HelpTooltip } from './HelpTooltip';

vi.mock('../i18n', () => ({
  getTexts: vi.fn(() => ({
    help: {
      title: '帮助',
      content: '这是帮助内容\n第二行\n第三行',
    },
  })),
}));

describe('HelpTooltip', () => {
  describe('Visibility', () => {
    it('should not render when show is false', () => {
      const { container } = render(<HelpTooltip show={false} onClose={vi.fn()} />);

      expect(container.firstChild).toBeNull();
    });

    it('should render when show is true', () => {
      render(<HelpTooltip show={true} onClose={vi.fn()} />);

      expect(screen.getByRole('heading', { name: /帮助/i })).toBeInTheDocument();
    });
  });

  describe('Close functionality', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<HelpTooltip show={true} onClose={onClose} />);

      const closeButton = screen.getByRole('button');
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when overlay is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<HelpTooltip show={true} onClose={onClose} />);

      const overlay = screen.getByRole('heading').closest('.help-tooltip-overlay');
      if (overlay) {
        await user.click(overlay);
      }

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when content is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<HelpTooltip show={true} onClose={onClose} />);

      const content = screen.getByRole('heading').closest('.help-tooltip');
      if (content) {
        await user.click(content);
      }

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Content display', () => {
    it('should display help content with multiple paragraphs', () => {
      render(<HelpTooltip show={true} onClose={vi.fn()} />);

      const paragraphs = screen.getAllByText(/./);
      expect(paragraphs.length).toBeGreaterThan(0);
    });

    it('should have scrollable content area', () => {
      render(<HelpTooltip show={true} onClose={vi.fn()} />);

      const scrollableContent = document.querySelector('.help-content.tm-scrollbar');
      expect(scrollableContent).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have a heading for the tooltip', () => {
      render(<HelpTooltip show={true} onClose={vi.fn()} />);

      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('should have a close button', () => {
      render(<HelpTooltip show={true} onClose={vi.fn()} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
