import { DeckLatticeError } from '../errors.js';
import { sanitizeSvg } from '../svg.js';
import type { V2Block, V2BlockType } from './types.js';

// ---------------------------------------------------------------------------
// Private helpers (mirrors of validation.ts helpers, scoped to this module)
// ---------------------------------------------------------------------------

function objectValue(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DeckLatticeError(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new DeckLatticeError(`${path} must be a string`);
  if (!value.trim())            throw new DeckLatticeError(`${path} must not be empty`);
  return value;
}

function arrayValue(value: unknown, path: string, min = 0, max?: number): unknown[] {
  if (!Array.isArray(value)) throw new DeckLatticeError(`${path} must be an array`);
  if (value.length < min)    throw new DeckLatticeError(`${path} must have at least ${min} item(s)`);
  if (max !== undefined && value.length > max) {
    throw new DeckLatticeError(`${path} must have at most ${max} item(s)`);
  }
  return value;
}

function stringArray(value: unknown, path: string, min = 0, max?: number): string[] {
  return arrayValue(value, path, min, max).map(
    (item, i) => stringValue(item, `${path}[${i}]`)
  );
}

// ---------------------------------------------------------------------------
// Block validation
// ---------------------------------------------------------------------------

const ALL_BLOCK_TYPES = new Set<V2BlockType>([
  'bullets', 'text', 'quote', 'image', 'code', 'chart',
  'mermaid', 'math', 'metrics', 'timeline', 'table'
]);

const SIDEBAR_MAIN = new Set<V2BlockType>(['bullets', 'text', 'code', 'metrics', 'timeline', 'table']);
const SIDEBAR_ASIDE = new Set<V2BlockType>(['image', 'chart', 'mermaid', 'math', 'code']);

interface SlotDef { required: boolean; allowed: Set<V2BlockType> }

const LAYOUT_SLOTS: Record<string, Record<string, SlotDef>> = {
  'v2-hero':         { subtitle: { required: false, allowed: new Set(['text']) },
                       meta:     { required: false, allowed: new Set(['bullets']) } },
  'v2-section':      {},
  'v2-full':         { main:  { required: true, allowed: ALL_BLOCK_TYPES } },
  'v2-sidebar-right':{ main:  { required: true, allowed: SIDEBAR_MAIN },
                       aside: { required: true, allowed: SIDEBAR_ASIDE } },
  'v2-sidebar-left': { main:  { required: true, allowed: SIDEBAR_MAIN },
                       aside: { required: true, allowed: SIDEBAR_ASIDE } },
  'v2-columns-2':    { left:  { required: true, allowed: ALL_BLOCK_TYPES },
                       right: { required: true, allowed: ALL_BLOCK_TYPES } },
  'v2-columns-3':    { col1:  { required: true, allowed: ALL_BLOCK_TYPES },
                       col2:  { required: true, allowed: ALL_BLOCK_TYPES },
                       col3:  { required: true, allowed: ALL_BLOCK_TYPES } },
  'v2-header-body':  { main:  { required: true, allowed: ALL_BLOCK_TYPES } }
};

function validateBlock(value: unknown, path: string): V2Block {
  const block = objectValue(value, path);
  const type = stringValue(block.type, `${path}.type`);
  if (!ALL_BLOCK_TYPES.has(type as V2BlockType)) {
    throw new DeckLatticeError(`${path}.type is unsupported: ${type}`);
  }

  switch (type as V2BlockType) {
    case 'bullets':
      stringArray(block.items, `${path}.items`, 1, 8);
      break;
    case 'text':
      stringValue(block.content, `${path}.content`);
      break;
    case 'quote':
      stringValue(block.quote, `${path}.quote`);
      if ('author' in block) stringValue(block.author, `${path}.author`);
      break;
    case 'image':
      stringValue(block.url, `${path}.url`);
      stringValue(block.alt, `${path}.alt`);
      if ('caption' in block) stringValue(block.caption, `${path}.caption`);
      if ('source'  in block) stringValue(block.source,  `${path}.source`);
      break;
    case 'code':
      stringValue(block.code, `${path}.code`);
      if ('language'        in block) stringValue(block.language,        `${path}.language`);
      if ('highlight_lines' in block) stringValue(block.highlight_lines, `${path}.highlight_lines`);
      break;
    case 'chart':
      if ('alt' in block) stringValue(block.alt, `${path}.alt`);
      if ('svg' in block) {
        sanitizeSvg(stringValue(block.svg, `${path}.svg`), `${path}.svg`);
      }
      if ('config' in block) {
        const cfg = objectValue(block.config, `${path}.config`);
        stringValue(cfg.type, `${path}.config.type`);
        objectValue(cfg.data, `${path}.config.data`);
      }
      break;
    case 'mermaid':
      stringValue(block.diagram, `${path}.diagram`);
      break;
    case 'math':
      stringValue(block.equation, `${path}.equation`);
      break;
    case 'metrics':
      arrayValue(block.items, `${path}.items`, 1, 4).forEach((item, i) => {
        const m = objectValue(item, `${path}.items[${i}]`);
        stringValue(m.value, `${path}.items[${i}].value`);
        stringValue(m.label, `${path}.items[${i}].label`);
      });
      break;
    case 'timeline':
      arrayValue(block.events, `${path}.events`, 1, 6).forEach((ev, i) => {
        const e = objectValue(ev, `${path}.events[${i}]`);
        stringValue(e.label, `${path}.events[${i}].label`);
        stringValue(e.title, `${path}.events[${i}].title`);
        stringValue(e.desc,  `${path}.events[${i}].desc`);
      });
      break;
    case 'table': {
      const cols = stringArray(block.columns, `${path}.columns`, 1, 6);
      arrayValue(block.rows, `${path}.rows`, 1, 10).forEach((row, i) => {
        stringArray(row, `${path}.rows[${i}]`, cols.length, cols.length);
      });
      break;
    }
  }

  return block as unknown as V2Block;
}

// ---------------------------------------------------------------------------
// Public entry point — called from core/validation.ts
// ---------------------------------------------------------------------------

export function validateV2Slide(slide: Record<string, unknown>, path: string): void {
  const layout = slide.type as string;
  const slotDefs = LAYOUT_SLOTS[layout];
  if (!slotDefs) {
    throw new DeckLatticeError(`${path}.type is not a valid v2 layout: ${layout}`);
  }

  const slots = 'slots' in slide
    ? objectValue(slide.slots, `${path}.slots`)
    : {};

  for (const [slotName, def] of Object.entries(slotDefs)) {
    if (def.required && !(slotName in slots)) {
      throw new DeckLatticeError(`${path}.slots.${slotName} is required for layout ${layout}`);
    }
    if (slotName in slots) {
      const block = validateBlock(slots[slotName], `${path}.slots.${slotName}`);
      if (!def.allowed.has(block.type)) {
        throw new DeckLatticeError(
          `${path}.slots.${slotName}.type "${block.type}" is not allowed in ${layout}/${slotName}`
        );
      }
    }
  }

  const knownSlots = new Set(Object.keys(slotDefs));
  for (const name of Object.keys(slots)) {
    if (!knownSlots.has(name)) {
      throw new DeckLatticeError(`${path}.slots.${name} is not a valid slot for layout ${layout}`);
    }
  }
}
