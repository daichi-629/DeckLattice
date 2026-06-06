import { access } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { DeckLatticeError } from './errors.js';
import { sanitizeSvg } from './svg.js';
import { validateV2Slide } from './v2/validation.js';
import type { BaseSlide, DeckData, ProjectContext, SlideType } from './types.js';

const SLIDE_TYPES = new Set<SlideType>([
  'title',
  'section',
  'message',
  'two_column',
  'three_column',
  'image_right',
  'image_left',
  'full_image',
  'chart',
  'mermaid',
  'math',
  'quote',
  'code',
  'summary',
  'metrics',
  'process',
  'table',
  'timeline',
  'references',
  'v2-hero',
  'v2-section',
  'v2-full',
  'v2-sidebar-right',
  'v2-sidebar-left',
  'v2-columns-2',
  'v2-columns-3',
  'v2-header-body'
]);

const V2_LAYOUTS = new Set<SlideType>([
  'v2-hero',
  'v2-section',
  'v2-full',
  'v2-sidebar-right',
  'v2-sidebar-left',
  'v2-columns-2',
  'v2-columns-3',
  'v2-header-body'
]);

const REQUIRED_FIELDS: Record<SlideType, string[]> = {
  title: ['headline'],
  section: ['headline'],
  message: [],
  two_column: ['headline', 'left', 'right'],
  three_column: ['headline', 'columns'],
  image_right: ['headline', 'items', 'image_url', 'image_alt'],
  image_left: ['headline', 'items', 'image_url', 'image_alt'],
  full_image: ['headline', 'image_url', 'image_alt'],
  chart: ['headline', 'items'],
  mermaid: ['headline', 'diagram'],
  math: ['headline', 'equation'],
  quote: ['quote'],
  code: ['headline', 'code'],
  summary: ['headline', 'items'],
  metrics: ['headline', 'metrics'],
  process: ['headline', 'steps'],
  table: ['headline', 'columns', 'rows'],
  timeline: ['headline', 'events'],
  references: ['headline', 'items'],
  'v2-hero':         ['headline'],
  'v2-section':      ['headline'],
  'v2-full':         [],
  'v2-sidebar-right':['headline'],
  'v2-sidebar-left': ['headline'],
  'v2-columns-2':    [],
  'v2-columns-3':    [],
  'v2-header-body':  ['headline']
};

function objectValue(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DeckLatticeError(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw new DeckLatticeError(`${path} must be a string`);
  }
  if (!value.trim()) {
    throw new DeckLatticeError(`${path} must not be empty`);
  }
  return value;
}

function arrayValue(
  value: unknown,
  path: string,
  minimum = 0,
  maximum?: number
): unknown[] {
  if (!Array.isArray(value)) {
    throw new DeckLatticeError(`${path} must be an array`);
  }
  if (value.length < minimum) {
    throw new DeckLatticeError(`${path} must contain at least ${minimum} item(s)`);
  }
  if (maximum !== undefined && value.length > maximum) {
    throw new DeckLatticeError(`${path} must contain at most ${maximum} item(s)`);
  }
  return value;
}

function stringArray(
  value: unknown,
  path: string,
  minimum = 0,
  maximum?: number
): string[] {
  return arrayValue(value, path, minimum, maximum).map(
    (item, index) => stringValue(item, `${path}[${index}]`)
  );
}

function validateTitleDescriptionItems(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number
): void {
  arrayValue(value, path, minimum, maximum).forEach((item, index) => {
    const entry = objectValue(item, `${path}[${index}]`);
    stringValue(entry.title, `${path}[${index}].title`);
    stringValue(entry.desc, `${path}[${index}].desc`);
  });
}

function validateSlide(slideValue: unknown, index: number): BaseSlide {
  const path = `slides[${index}]`;
  const slide = objectValue(slideValue, path);
  const id = stringValue(slide.id, `${path}.id`);
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(id)) {
    throw new DeckLatticeError(`${path}.id contains unsupported characters: ${id}`);
  }

  const type = stringValue(slide.type, `${path}.type`) as SlideType;
  if (!SLIDE_TYPES.has(type)) {
    throw new DeckLatticeError(`${path}.type is unsupported: ${type}`);
  }
  for (const field of REQUIRED_FIELDS[type]) {
    if (!(field in slide)) {
      throw new DeckLatticeError(`${path}.${field} is required for type ${type}`);
    }
  }

  for (const field of [
    'headline',
    'subtitle',
    'section_label',
    'quote',
    'author',
    'code',
    'language',
    'speaker_note',
    'image_url',
    'image_alt',
    'image_caption',
    'source',
    'diagram',
    'equation'
  ]) {
    if (field in slide) stringValue(slide[field], `${path}.${field}`);
  }
  if ('chart_alt' in slide) stringValue(slide.chart_alt, `${path}.chart_alt`);
  if (typeof slide.headline === 'string' && slide.headline.length > 80) {
    throw new DeckLatticeError(`${path}.headline must be at most 80 characters`);
  }
  if (typeof slide.speaker_note === 'string' && slide.speaker_note.length > 4000) {
    throw new DeckLatticeError(`${path}.speaker_note must be at most 4000 characters`);
  }
  if ('meta' in slide) stringArray(slide.meta, `${path}.meta`);
  if (type === 'image_right' || type === 'image_left' || type === 'chart') {
    stringArray(slide.items, `${path}.items`, 1, 5);
  }
  if (type === 'mermaid' && 'items' in slide) {
    stringArray(slide.items, `${path}.items`, 1, 4);
  }
  if (type === 'math' && 'items' in slide) {
    stringArray(slide.items, `${path}.items`, 1, 4);
  }
  if ('additional_classes' in slide) {
    for (const className of stringArray(
      slide.additional_classes,
      `${path}.additional_classes`
    )) {
      if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(className)) {
        throw new DeckLatticeError(
          `${path}.additional_classes contains an invalid CSS class`
        );
      }
    }
  }

  if (type === 'message') {
    const hasMessage = typeof slide.message === 'string' && slide.message.trim() !== '';
    const hasLines = 'message_lines' in slide;
    if (!hasMessage && !hasLines) {
      throw new DeckLatticeError(`${path} requires message or message_lines`);
    }
    if (hasLines) stringArray(slide.message_lines, `${path}.message_lines`, 1, 4);
  }
  if (type === 'two_column') {
    for (const side of ['left', 'right']) {
      const column = objectValue(slide[side], `${path}.${side}`);
      const columnType = typeof column.type === 'string' ? column.type : 'text';
      if (!['text', 'image', 'code'].includes(columnType)) {
        throw new DeckLatticeError(
          `${path}.${side}.type must be "text", "image", or "code"`
        );
      }
      if ('title' in column) stringValue(column.title, `${path}.${side}.title`);
      if (columnType === 'image') {
        stringValue(column.image_url, `${path}.${side}.image_url`);
        stringValue(column.image_alt, `${path}.${side}.image_alt`);
      } else if (columnType === 'code') {
        stringValue(column.code, `${path}.${side}.code`);
        if ('language' in column) stringValue(column.language, `${path}.${side}.language`);
      } else {
        stringValue(column.title, `${path}.${side}.title`);
        stringArray(column.items, `${path}.${side}.items`, 1, 5);
      }
    }
  }
  if (type === 'three_column') {
    validateTitleDescriptionItems(slide.columns, `${path}.columns`, 3, 3);
  }
  if (type === 'summary') {
    validateTitleDescriptionItems(slide.items, `${path}.items`, 1, 4);
  }
  if (type === 'metrics') {
    arrayValue(slide.metrics, `${path}.metrics`, 1, 4).forEach((item, itemIndex) => {
      const metric = objectValue(item, `${path}.metrics[${itemIndex}]`);
      stringValue(metric.value, `${path}.metrics[${itemIndex}].value`);
      stringValue(metric.label, `${path}.metrics[${itemIndex}].label`);
    });
  }
  if (type === 'process') {
    validateTitleDescriptionItems(slide.steps, `${path}.steps`, 2, 6);
  }
  if (type === 'table') {
    const columns = stringArray(slide.columns, `${path}.columns`, 1, 5);
    arrayValue(slide.rows, `${path}.rows`, 1, 8).forEach((row, rowIndex) => {
      stringArray(row, `${path}.rows[${rowIndex}]`, columns.length, columns.length);
    });
  }
  if (type === 'timeline') {
    arrayValue(slide.events, `${path}.events`, 1, 6).forEach((item, itemIndex) => {
      const event = objectValue(item, `${path}.events[${itemIndex}]`);
      stringValue(event.label, `${path}.events[${itemIndex}].label`);
      stringValue(event.title, `${path}.events[${itemIndex}].title`);
      stringValue(event.desc, `${path}.events[${itemIndex}].desc`);
    });
  }
  if (type === 'references') {
    arrayValue(slide.items, `${path}.items`, 1, 8).forEach((item, itemIndex) => {
      const reference = objectValue(item, `${path}.items[${itemIndex}]`);
      stringValue(reference.label, `${path}.items[${itemIndex}].label`);
      stringValue(reference.url, `${path}.items[${itemIndex}].url`);
    });
  }
  if (type === 'code' && 'highlight_lines' in slide) {
    stringValue(slide.highlight_lines, `${path}.highlight_lines`);
  }
  if (type === 'chart' && 'chart_svg' in slide) {
    sanitizeSvg(stringValue(slide.chart_svg, `${path}.chart_svg`), `${path}.chart_svg`);
  }
  if (type === 'chart' && 'chart_config' in slide) {
    const config = objectValue(slide.chart_config, `${path}.chart_config`);
    stringValue(config.type, `${path}.chart_config.type`);
    objectValue(config.data, `${path}.chart_config.data`);
  }
  if (V2_LAYOUTS.has(type)) {
    validateV2Slide(slide, path);
  }

  return slide as unknown as BaseSlide;
}

export async function validateDeck(
  value: unknown,
  project: ProjectContext
): Promise<DeckData> {
  const root = objectValue(value, 'slides.json root');
  const deckTitle = stringValue(root.deck_title, 'deck_title');
  if ('short_title' in root) stringValue(root.short_title, 'short_title');
  if ('lang' in root) stringValue(root.lang, 'lang');

  const cssFiles = 'additional_css' in root
    ? stringArray(root.additional_css, 'additional_css')
    : [];
  for (const cssFile of cssFiles) {
    const cssPath = resolve(project.deckDir, cssFile);
    const relativePath = relative(project.deckDir, cssPath);
    if (
      !relativePath
      || relativePath.startsWith('..')
      || isAbsolute(relativePath)
      || extname(cssPath).toLowerCase() !== '.css'
    ) {
      throw new DeckLatticeError(`additional_css must stay inside deck/: ${cssFile}`);
    }
    try {
      await access(cssPath);
    } catch {
      throw new DeckLatticeError(`additional_css file does not exist: ${cssFile}`);
    }
  }

  const slides = arrayValue(root.slides, 'slides', 1).map(validateSlide);
  const ids = new Set<string>();
  for (const slide of slides) {
    if (ids.has(slide.id)) {
      throw new DeckLatticeError(`duplicate slide id: ${slide.id}`);
    }
    ids.add(slide.id);
  }

  return {
    ...(root as unknown as DeckData),
    deck_title: deckTitle,
    slides
  };
}
