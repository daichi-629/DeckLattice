import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { DeckLatticeError } from './errors.js';

const FORBIDDEN_ELEMENTS = new Set([
  'script',
  'foreignObject',
  'iframe',
  'object',
  'embed'
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  preserveOrder: true,
  attributeNamePrefix: '@_'
});

function localName(name: string): string {
  return name.includes(':') ? name.slice(name.lastIndexOf(':') + 1) : name;
}

function inspectNode(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((item) => inspectNode(item, path));
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === ':@' && child && typeof child === 'object') {
      for (const [attribute, attributeValue] of Object.entries(
        child as Record<string, unknown>
      )) {
        const name = localName(attribute.replace(/^@_/, '')).toLowerCase();
        const stringValue = String(attributeValue);
        if (name.startsWith('on')) {
          throw new DeckLatticeError(`${path} contains an event handler attribute`);
        }
        if (
          (name === 'href' || name === 'src')
          && /^\s*(?:javascript:|https?:|\/\/)/i.test(stringValue)
        ) {
          throw new DeckLatticeError(`${path} contains a forbidden external URL`);
        }
      }
      continue;
    }

    const elementName = localName(key);
    if (FORBIDDEN_ELEMENTS.has(elementName)) {
      throw new DeckLatticeError(`${path} contains forbidden <${elementName}> element`);
    }
    inspectNode(child, path);
  }
}

export function sanitizeSvg(svg: string, path = 'chart_svg'): string {
  const validation = XMLValidator.validate(svg);
  if (validation !== true) {
    throw new DeckLatticeError(`${path} is invalid XML: ${validation.err.msg}`);
  }

  const document = parser.parse(svg) as unknown[];
  const root = document.find((node) => {
    if (!node || typeof node !== 'object') return false;
    return Object.keys(node as Record<string, unknown>)
      .some((key) => localName(key) === 'svg');
  });
  if (!root) {
    throw new DeckLatticeError(`${path} root element must be <svg>`);
  }

  inspectNode(document, path);
  return svg;
}
