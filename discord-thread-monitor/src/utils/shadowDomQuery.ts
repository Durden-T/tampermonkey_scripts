/**
 * Recursively queries elements across shadow DOM boundaries.
 * Standard querySelector* methods cannot pierce shadow roots.
 */
export function querySelectorAllDeep(
  selector: string,
  root: Document | Element | ShadowRoot = document
): Element[] {
  const results: Element[] = [];

  const traverseForShadowRoots = (node: Element) => {
    if (node.shadowRoot) {
      const shadowMatches = querySelectorAllDeep(selector, node.shadowRoot);
      results.push(...shadowMatches);
    }
    for (const child of node.children) {
      traverseForShadowRoots(child);
    }
  };

  if (root instanceof Document) {
    const lightDomMatches = Array.from(root.querySelectorAll(selector));
    results.push(...lightDomMatches);

    if (root.documentElement) {
      traverseForShadowRoots(root.documentElement);
    }
  } else {
    const lightDomMatches = Array.from(root.querySelectorAll(selector));
    results.push(...lightDomMatches);

    const startElement = root instanceof ShadowRoot ? root.host : root;
    if (root instanceof ShadowRoot) {
      const children = Array.from(root.children);
      children.forEach(traverseForShadowRoots);
    } else {
      traverseForShadowRoots(startElement);
    }
  }

  return results;
}

/**
 * Finds the closest ancestor matching a selector, crossing shadow DOM boundaries.
 * Standard closest() cannot traverse upward through shadow roots.
 */
export function closestDeep(element: Element, selector: string): Element | null {
  // Try standard closest first (within same DOM tree)
  const standardMatch = element.closest(selector);
  if (standardMatch) {
    return standardMatch;
  }

  // Traverse up through shadow DOM boundaries
  let current: Element | null = element;

  while (current) {
    // Check if we're at a shadow root boundary
    const root = current.getRootNode();
    if (root instanceof ShadowRoot) {
      // Move to shadow host and continue search
      current = root.host;
      const hostMatch = current.closest(selector);
      if (hostMatch) {
        return hostMatch;
      }
    } else {
      // Reached document root without finding match
      return null;
    }
  }

  return null;
}
