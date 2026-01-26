const addMatchesToResults = (results: Element[], matches: NodeListOf<Element>): void => {
  for (let i = 0; i < matches.length; i++) {
    results.push(matches[i]);
  }
};

const enqueueChildren = (queue: Element[], children: HTMLCollection): void => {
  for (let i = 0; i < children.length; i++) {
    queue.push(children[i]);
  }
};

const processElement = (
  element: Element,
  selector: string,
  results: Element[],
  queue: Element[]
): void => {
  if (element.shadowRoot) {
    addMatchesToResults(results, element.shadowRoot.querySelectorAll(selector));
    enqueueChildren(queue, element.shadowRoot.children);
  }

  enqueueChildren(queue, element.children);
};

/**
 * Iteratively queries elements across shadow DOM boundaries.
 * Standard querySelector* methods cannot pierce shadow roots.
 * Uses iterative traversal with a queue for better performance.
 */
export function querySelectorAllDeep(
  selector: string,
  root: Document | Element | ShadowRoot = document
): Element[] {
  const results: Element[] = [];
  const queue: Element[] = [];
  let queueIndex = 0;

  if (root instanceof Document) {
    addMatchesToResults(results, root.querySelectorAll(selector));
    if (root.documentElement) {
      queue.push(root.documentElement);
    }
  } else {
    addMatchesToResults(results, root.querySelectorAll(selector));

    if (root instanceof ShadowRoot) {
      enqueueChildren(queue, root.children);
    } else {
      queue.push(root);
    }
  }

  while (queueIndex < queue.length) {
    const node = queue[queueIndex++];
    processElement(node, selector, results, queue);
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
