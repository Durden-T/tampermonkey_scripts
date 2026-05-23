const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'xlink:href']);
const JS_URL_RE = /^\s*javascript:/i;
const DATA_HTML_URL_RE = /^\s*data:text\/html/i;

export function sanitizeElement(root: Element): Element {
  const elements: Element[] = [root];
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = walker.nextNode();
  while (node) {
    if (node instanceof Element) elements.push(node);
    node = walker.nextNode();
  }
  for (const el of elements) {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (URL_ATTRS.has(name) && (JS_URL_RE.test(attr.value) || DATA_HTML_URL_RE.test(attr.value))) {
        el.removeAttribute(attr.name);
      }
    }
  }
  return root;
}

export function sanitizeHtmlString(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  sanitizeElement(doc.body);
  return doc.body.innerHTML;
}
