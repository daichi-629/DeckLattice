import { escapeHtml } from '../html.js';
import { DeckLatticeError } from '../errors.js';
import { renderBlock } from './blocks.js';
import type { BaseSlide } from '../types.js';
import type { V2Block, V2Slots } from './types.js';

function slots(slide: BaseSlide): V2Slots {
  return (slide.slots ?? {}) as V2Slots;
}

function slotHtml(slide: BaseSlide, name: string): string {
  const block = slots(slide)[name] as V2Block | undefined;
  if (!block) return '';
  return `<div class="v2-slot v2-slot--${name}">${renderBlock(block)}</div>`;
}

function headerHtml(headline: string): string {
  return (
    '<div class="slide-header">'
    + `<h2 class="slide-headline">${escapeHtml(headline)}</h2>`
    + '</div>'
  );
}

function footerHtml(deckTitle: string, index: number, total: number): string {
  return (
    '<div class="slide-footer">'
    + `<span class="deck-title">${escapeHtml(deckTitle)}</span>`
    + `<span class="slide-number">${index}/${total}</span>`
    + '</div>'
  );
}

export function renderSlideBodyV2(
  slide: BaseSlide,
  index: number,
  total: number,
  deckTitle: string,
  sectionNumber?: number
): string {
  const type = slide.type;
  const headline = typeof slide.headline === 'string' ? slide.headline : '';
  const titleless = type === 'v2-hero' || type === 'v2-section';
  const header = headline && !titleless ? headerHtml(headline) : '';
  const footer = footerHtml(deckTitle, index, total);

  switch (type) {
    case 'v2-hero':
      return (
        '<div class="v2-slide-content v2-hero">'
        + `<h1 class="v2-hero-title">${escapeHtml(headline)}</h1>`
        + slotHtml(slide, 'subtitle')
        + slotHtml(slide, 'meta')
        + '</div>'
      );

    case 'v2-section': {
      const label = `SECTION ${String(sectionNumber ?? index).padStart(2, '0')}`;
      return (
        '<div class="v2-slide-content v2-section">'
        + `<div class="v2-section-label">${escapeHtml(label)}</div>`
        + `<h2>${escapeHtml(headline)}</h2>`
        + '</div>'
      );
    }

    case 'v2-full':
      return (
        `<div class="v2-slide-content v2-full">${header}`
        + `<div class="v2-body">${slotHtml(slide, 'main')}</div>`
        + footer + '</div>'
      );

    case 'v2-sidebar-right':
      return (
        `<div class="v2-slide-content v2-sidebar-right">${header}`
        + '<div class="v2-body">'
        + slotHtml(slide, 'main')
        + slotHtml(slide, 'aside')
        + `</div>${footer}</div>`
      );

    case 'v2-sidebar-left':
      return (
        `<div class="v2-slide-content v2-sidebar-left">${header}`
        + '<div class="v2-body">'
        + slotHtml(slide, 'aside')
        + slotHtml(slide, 'main')
        + `</div>${footer}</div>`
      );

    case 'v2-columns-2':
      return (
        `<div class="v2-slide-content v2-columns-2">${header}`
        + '<div class="v2-body">'
        + slotHtml(slide, 'left')
        + slotHtml(slide, 'right')
        + `</div>${footer}</div>`
      );

    case 'v2-columns-3':
      return (
        `<div class="v2-slide-content v2-columns-3">${header}`
        + '<div class="v2-body">'
        + slotHtml(slide, 'col1')
        + slotHtml(slide, 'col2')
        + slotHtml(slide, 'col3')
        + `</div>${footer}</div>`
      );

    case 'v2-header-body':
      return (
        `<div class="v2-slide-content v2-header-body">${header}`
        + `<div class="v2-body">${slotHtml(slide, 'main')}</div>`
        + footer + '</div>'
      );

    default:
      throw new DeckLatticeError(`unhandled v2 layout: ${String(type)}`);
  }
}
