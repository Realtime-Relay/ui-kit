import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PresenceIndicator } from '../src/indicators/PresenceIndicator';

describe('PresenceIndicator', () => {
  describe('rendering', () => {
    it('renders with online=true', () => {
      const { container } = render(<PresenceIndicator online={true} />);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders with online=false', () => {
      const { container } = render(<PresenceIndicator online={false} />);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders as a span element', () => {
      const { container } = render(<PresenceIndicator online={true} />);
      expect(container.firstChild?.nodeName).toBe('SPAN');
    });
  });

  describe('accessibility', () => {
    it('has role="status"', () => {
      render(<PresenceIndicator online={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-label="Online" when online', () => {
      render(<PresenceIndicator online={true} />);
      expect(screen.getByLabelText('Online')).toBeInTheDocument();
    });

    it('has aria-label="Offline" when offline', () => {
      render(<PresenceIndicator online={false} />);
      expect(screen.getByLabelText('Offline')).toBeInTheDocument();
    });
  });

  describe('sizing', () => {
    it('uses default size of 12px', () => {
      const { container } = render(<PresenceIndicator online={true} />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.width).toBe('12px');
      expect(el.style.height).toBe('12px');
    });

    it('accepts custom size', () => {
      const { container } = render(<PresenceIndicator online={true} size={24} />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.width).toBe('24px');
      expect(el.style.height).toBe('24px');
    });

    it('handles small sizes', () => {
      const { container } = render(<PresenceIndicator online={true} size={6} />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.width).toBe('6px');
    });

    it('handles large sizes', () => {
      const { container } = render(<PresenceIndicator online={true} size={48} />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.width).toBe('48px');
    });
  });

  describe('colors', () => {
    it('uses custom onlineColor when online', () => {
      const { container } = render(
        <PresenceIndicator online={true} onlineColor="#3b82f6" />
      );
      const el = container.firstChild as HTMLElement;
      expect(el.style.backgroundColor).toBe('rgb(59, 130, 246)');
    });

    it('uses custom offlineColor when offline', () => {
      const { container } = render(
        <PresenceIndicator online={false} offlineColor="#9ca3af" />
      );
      const el = container.firstChild as HTMLElement;
      expect(el.style.backgroundColor).toBe('rgb(156, 163, 175)');
    });

    it('falls back to CSS variable when no custom color provided (online)', () => {
      const { container } = render(<PresenceIndicator online={true} />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.backgroundColor).toContain('var(--relay-presence-online');
    });

    it('falls back to CSS variable when no custom color provided (offline)', () => {
      const { container } = render(<PresenceIndicator online={false} />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.backgroundColor).toContain('var(--relay-presence-offline');
    });
  });

  describe('visual style', () => {
    it('is a circle (border-radius 50%)', () => {
      const { container } = render(<PresenceIndicator online={true} />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.borderRadius).toBe('50%');
    });

    it('is inline-block', () => {
      const { container } = render(<PresenceIndicator online={true} />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.display).toBe('inline-block');
    });

    it('has flexShrink 0', () => {
      const { container } = render(<PresenceIndicator online={true} />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.flexShrink).toBe('0');
    });

    it('has transition for smooth state changes', () => {
      const { container } = render(<PresenceIndicator online={true} />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.transition).toContain('background-color');
      expect(el.style.transition).toContain('200ms');
    });
  });

  describe('glow effect', () => {
    it('has box-shadow glow when online with custom color', () => {
      const { container } = render(
        <PresenceIndicator online={true} onlineColor="#22c55e" />
      );
      const el = container.firstChild as HTMLElement;
      expect(el.style.boxShadow).toContain('0 0 0 3px');
    });

    it('has no box-shadow when offline', () => {
      const { container } = render(<PresenceIndicator online={false} />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.boxShadow).toBe('');
    });
  });

  describe('edge cases', () => {
    it('handles size=0 without crashing', () => {
      const { container } = render(<PresenceIndicator online={true} size={0} />);
      const el = container.firstChild as HTMLElement;
      expect(el.style.width).toBe('0px');
    });

    it('renders correctly when toggled rapidly', () => {
      const { rerender, container } = render(<PresenceIndicator online={true} />);
      rerender(<PresenceIndicator online={false} />);
      rerender(<PresenceIndicator online={true} />);
      rerender(<PresenceIndicator online={false} />);
      const el = container.firstChild as HTMLElement;
      expect(screen.getByLabelText('Offline')).toBeInTheDocument();
    });
  });
});
