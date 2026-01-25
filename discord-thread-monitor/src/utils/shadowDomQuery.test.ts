import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { querySelectorAllDeep, closestDeep } from './shadowDomQuery';

describe('shadowDomQuery', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('querySelectorAllDeep', () => {
    it('should find elements in light DOM', () => {
      container.innerHTML = `
        <div class="target">Item 1</div>
        <div class="target">Item 2</div>
      `;

      const results = querySelectorAllDeep('.target', container);
      expect(results).toHaveLength(2);
    });

    it('should find elements inside shadow DOM', () => {
      const host = document.createElement('div');
      container.appendChild(host);

      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <div class="target">Shadow Item 1</div>
        <div class="target">Shadow Item 2</div>
      `;

      const results = querySelectorAllDeep('.target', container);
      expect(results).toHaveLength(2);
      expect(results[0].textContent).toBe('Shadow Item 1');
    });

    it('should find elements in both light and shadow DOM', () => {
      container.innerHTML = `<div class="target">Light Item</div>`;

      const host = document.createElement('div');
      container.appendChild(host);

      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `<div class="target">Shadow Item</div>`;

      const results = querySelectorAllDeep('.target', container);
      expect(results).toHaveLength(2);
    });

    it('should find elements in nested shadow DOM', () => {
      const host1 = document.createElement('div');
      container.appendChild(host1);

      const shadow1 = host1.attachShadow({ mode: 'open' });
      shadow1.innerHTML = `<div class="target">Shadow Level 1</div>`;

      const host2 = document.createElement('div');
      shadow1.appendChild(host2);

      const shadow2 = host2.attachShadow({ mode: 'open' });
      shadow2.innerHTML = `<div class="target">Shadow Level 2</div>`;

      const results = querySelectorAllDeep('.target', container);
      expect(results).toHaveLength(2);
    });

    it('should handle complex selectors', () => {
      const host = document.createElement('div');
      container.appendChild(host);

      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <div data-list-item-id="channels___123" aria-label="Test (thread)">Thread 1</div>
        <div data-list-item-id="channels___456" aria-label="Test (thread)">Thread 2</div>
      `;

      const results = querySelectorAllDeep(
        '[data-list-item-id^="channels___"][aria-label*="(thread)"]',
        container
      );
      expect(results).toHaveLength(2);
    });

    it('should return empty array when no matches found', () => {
      container.innerHTML = `<div>No matches</div>`;

      const results = querySelectorAllDeep('.nonexistent', container);
      expect(results).toHaveLength(0);
    });

    it('should default to document root when no root specified', () => {
      const tempDiv = document.createElement('div');
      tempDiv.className = 'temp-test-element';
      document.body.appendChild(tempDiv);

      const results = querySelectorAllDeep('.temp-test-element');
      expect(results.length).toBeGreaterThan(0);

      tempDiv.remove();
    });
  });

  describe('closestDeep', () => {
    it('should find closest ancestor in light DOM', () => {
      container.innerHTML = `
        <div class="parent">
          <div class="child">
            <span id="target">Text</span>
          </div>
        </div>
      `;

      const target = container.querySelector('#target') as HTMLElement;
      const result = closestDeep(target, '.parent');

      expect(result).not.toBeNull();
      expect(result?.classList.contains('parent')).toBe(true);
    });

    it('should find ancestor across shadow boundary', () => {
      container.innerHTML = `<div class="outer-parent"></div>`;

      const host = document.createElement('div');
      container.querySelector('.outer-parent')?.appendChild(host);

      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `<span id="shadow-target">Text</span>`;

      const target = shadow.querySelector('#shadow-target') as HTMLElement;
      const result = closestDeep(target, '.outer-parent');

      expect(result).not.toBeNull();
      expect(result?.classList.contains('outer-parent')).toBe(true);
    });

    it('should traverse multiple shadow boundaries', () => {
      container.innerHTML = `<div class="root-parent"></div>`;

      const host1 = document.createElement('div');
      container.querySelector('.root-parent')?.appendChild(host1);

      const shadow1 = host1.attachShadow({ mode: 'open' });
      const host2 = document.createElement('div');
      shadow1.appendChild(host2);

      const shadow2 = host2.attachShadow({ mode: 'open' });
      shadow2.innerHTML = `<span id="deep-target">Text</span>`;

      const target = shadow2.querySelector('#deep-target') as HTMLElement;
      const result = closestDeep(target, '.root-parent');

      expect(result).not.toBeNull();
      expect(result?.classList.contains('root-parent')).toBe(true);
    });

    it('should return null when no ancestor matches', () => {
      container.innerHTML = `<div><span id="target">Text</span></div>`;

      const target = container.querySelector('#target') as HTMLElement;
      const result = closestDeep(target, '.nonexistent');

      expect(result).toBeNull();
    });

    it('should match selector with complex attributes', () => {
      container.innerHTML = `
        <ul role="group" aria-label="General threads"></ul>
      `;

      const host = document.createElement('div');
      container.querySelector('ul')?.appendChild(host);

      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `<div id="target">Text</div>`;

      const target = shadow.querySelector('#target') as HTMLElement;
      const result = closestDeep(target, 'ul[role="group"][aria-label*="threads"]');

      expect(result).not.toBeNull();
      expect(result?.getAttribute('aria-label')).toBe('General threads');
    });

    it('should find match within same shadow root before crossing boundary', () => {
      const host = document.createElement('div');
      container.appendChild(host);

      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <div class="shadow-parent">
          <span id="target">Text</span>
        </div>
      `;

      const target = shadow.querySelector('#target') as HTMLElement;
      const result = closestDeep(target, '.shadow-parent');

      expect(result).not.toBeNull();
      expect(result?.classList.contains('shadow-parent')).toBe(true);
      // Should be in shadow DOM, not light DOM
      expect(result?.getRootNode()).toBeInstanceOf(ShadowRoot);
    });
  });
});
