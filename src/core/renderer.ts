import { escapeHtml, inlineMarkdown } from './html.js';
import { sanitizeSvg } from './svg.js';
import { renderSlideBodyV2 } from './v2/renderer.js';
import type { BaseSlide } from './types.js';
import { DeckLatticeError } from './errors.js';

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value as UnknownRecord;
}

function text(slide: UnknownRecord, key: string, fallback = ''): string {
  return typeof slide[key] === 'string' ? slide[key] : fallback;
}

function strings(value: unknown): string[] {
  return value as string[];
}

function records(value: unknown): UnknownRecord[] {
  return value as UnknownRecord[];
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

function listHtml(items: string[]): string {
  return `<ul>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`;
}

function mediaCaption(slide: UnknownRecord): string {
  const caption = text(slide, 'image_caption');
  const source = text(slide, 'source');
  if (!caption && !source) return '';
  const parts = [
    caption ? escapeHtml(caption) : '',
    source ? `Source: ${escapeHtml(source)}` : ''
  ].filter(Boolean);
  return `<div class="media-caption">${parts.join(' | ')}</div>`;
}

function renderBody(
  source: BaseSlide,
  index: number,
  total: number,
  deckTitle: string,
  sectionNumber?: number
): string {
  const slide = record(source);
  const type = source.type;
  const headline = text(slide, 'headline');
  const header = headline && !['title', 'section', 'message'].includes(type)
    ? headerHtml(headline)
    : '';
  const footer = footerHtml(deckTitle, index, total);

  if (type.startsWith('v2-')) {
    return renderSlideBodyV2(source, index, total, deckTitle, sectionNumber);
  }

  switch (type) {
    case 'title': {
      const meta = Array.isArray(slide.meta)
        ? strings(slide.meta).map((item) => `<span>${escapeHtml(item)}</span>`).join('')
        : '';
      const subtitle = text(slide, 'subtitle');
      return (
        '<div class="slide-content title"><div class="title-container">'
        + `<h1>${escapeHtml(headline)}</h1>`
        + (subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : '')
        + (meta ? `<div class="meta-info">${meta}</div>` : '')
        + '</div></div>'
      );
    }
    case 'section': {
      const label = text(slide, 'section_label');
      const sectionLabel = label || `SECTION ${String(sectionNumber ?? index).padStart(2, '0')}`;
      return (
        '<div class="slide-content section">'
        + `<div class="section-label">${escapeHtml(sectionLabel)}</div>`
        + `<h2>${escapeHtml(headline)}</h2></div>`
      );
    }
    case 'message': {
      const message = Array.isArray(slide.message_lines)
        ? strings(slide.message_lines).map(escapeHtml).join('<br>')
        : escapeHtml(text(slide, 'message'));
      return (
        '<div class="slide-content message">'
        + `<div class="message-text">${message}</div></div>`
      );
    }
    case 'two_column': {
      const columns = ['left', 'right'].map((side) => {
        const column = record(slide[side]);
        const columnType = text(column, 'type', 'text');
        let body: string;
        if (columnType === 'image') {
          body = (
            '<figure class="image-container">'
            + `<img src="${escapeHtml(text(column, 'image_url'))}" `
            + `alt="${escapeHtml(text(column, 'image_alt'))}">`
            + '</figure>'
          );
        } else if (columnType === 'code') {
          body = (
            '<div class="code-container"><pre>'
            + `<code class="language-${escapeHtml(text(column, 'language', 'plaintext'))}">`
            + `${escapeHtml(text(column, 'code'))}</code></pre></div>`
          );
        } else {
          body = listHtml(strings(column.items));
        }
        const titleHtml = column.title
          ? `<div class="column-title">${escapeHtml(text(column, 'title'))}</div>`
          : '';
        return `<div class="column">${titleHtml}${body}</div>`;
      }).join('');
      return (
        `<div class="slide-content two_column">${header}`
        + `<div class="slide-body">${columns}</div>${footer}</div>`
      );
    }
    case 'three_column': {
      const columns = records(slide.columns).map((column) => (
        '<div class="feature-card">'
        + `<div class="column-title">${escapeHtml(text(column, 'title'))}</div>`
        + `<div class="feature-desc">${escapeHtml(text(column, 'desc'))}</div></div>`
      )).join('');
      return (
        `<div class="slide-content three_column">${header}`
        + `<div class="slide-body">${columns}</div>${footer}</div>`
      );
    }
    case 'image_right': {
      const image = (
        '<figure class="image-container">'
        + `<img src="${escapeHtml(text(slide, 'image_url'))}" `
        + `alt="${escapeHtml(text(slide, 'image_alt'))}">`
        + `${mediaCaption(slide)}</figure>`
      );
      return (
        `<div class="slide-content image_right">${header}<div class="slide-body">`
        + `<div class="column">${listHtml(strings(slide.items))}</div>`
        + `<div class="column">${image}</div></div>${footer}</div>`
      );
    }
    case 'image_left': {
      const image = (
        '<figure class="image-container">'
        + `<img src="${escapeHtml(text(slide, 'image_url'))}" `
        + `alt="${escapeHtml(text(slide, 'image_alt'))}">`
        + `${mediaCaption(slide)}</figure>`
      );
      return (
        `<div class="slide-content image_left">${header}<div class="slide-body">`
        + `<div class="column">${image}</div>`
        + `<div class="column">${listHtml(strings(slide.items))}</div>`
        + `</div>${footer}</div>`
      );
    }
    case 'full_image': {
      const image = (
        '<figure class="full-image-container">'
        + `<img src="${escapeHtml(text(slide, 'image_url'))}" `
        + `alt="${escapeHtml(text(slide, 'image_alt'))}">`
        + `${mediaCaption(slide)}</figure>`
      );
      return (
        `<div class="slide-content full_image">${header}`
        + `<div class="slide-body">${image}</div>${footer}</div>`
      );
    }
    case 'chart': {
      const chartSvg = text(slide, 'chart_svg');
      let chart: string;
      if (slide.chart_config) {
        const config = JSON.stringify(slide.chart_config)
          .replaceAll('&', '\\u0026')
          .replaceAll('<', '\\u003c')
          .replaceAll('>', '\\u003e');
        chart = (
          '<div class="chart-canvas-container">'
          + `<canvas data-chart-config="${escapeHtml(config)}" `
          + `role="img" aria-label="${escapeHtml(text(slide, 'chart_alt', headline))}"></canvas>`
          + '</div>'
        );
      } else if (chartSvg) {
        chart = sanitizeSvg(chartSvg);
      } else {
        chart = (
          '<svg viewBox="0 0 400 300" role="img" aria-label="Sample bar chart">'
          + '<rect x="50" y="50" width="40" height="200" rx="4"/>'
          + '<rect x="130" y="100" width="40" height="150" rx="4" opacity=".8"/>'
          + '<rect x="210" y="20" width="40" height="230" rx="4"/>'
          + '<rect x="290" y="80" width="40" height="170" rx="4" opacity=".6"/>'
          + '<line x1="30" y1="250" x2="360" y2="250"/></svg>'
        );
      }
      return (
        `<div class="slide-content chart">${header}<div class="slide-body">`
        + `<div class="column">${listHtml(strings(slide.items))}</div>`
        + `<div class="column"><div class="chart-container">${chart}</div></div>`
        + `</div>${footer}</div>`
      );
    }
    case 'mermaid': {
      const items = Array.isArray(slide.items)
        ? `<div class="column">${listHtml(strings(slide.items))}</div>`
        : '';
      const noItemsClass = items ? '' : ' no-items';
      return (
        `<div class="slide-content mermaid_slide${noItemsClass}">${header}`
        + '<div class="slide-body">'
        + items
        + '<div class="mermaid-container">'
        + `<pre class="mermaid">${escapeHtml(text(slide, 'diagram'))}</pre>`
        + `</div></div>${footer}</div>`
      );
    }
    case 'math': {
      const items = Array.isArray(slide.items)
        ? `<div class="math-notes">${listHtml(strings(slide.items))}</div>`
        : '';
      return (
        `<div class="slide-content math_slide">${header}<div class="slide-body">`
        + `<div class="math-equation">${escapeHtml(text(slide, 'equation'))}</div>`
        + `${items}</div>${footer}</div>`
      );
    }
    case 'quote': {
      const author = text(slide, 'author');
      return (
        '<div class="slide-content quote"><figure class="quote-container">'
        + `<blockquote class="quote-text">${escapeHtml(text(slide, 'quote'))}</blockquote>`
        + (author ? `<div class="quote-author">- ${escapeHtml(author)}</div>` : '')
        + '</figure></div>'
      );
    }
    case 'code': {
      const highlightLines = text(slide, 'highlight_lines');
      const lineNumbersAttr = highlightLines
        ? ` data-line-numbers="${escapeHtml(highlightLines)}"`
        : '';
      return (
        `<div class="slide-content code">${header}<div class="slide-body">`
        + '<div class="code-container"><pre>'
        + `<code class="language-${escapeHtml(text(slide, 'language', 'plaintext'))}"${lineNumbersAttr}>`
        + `${escapeHtml(text(slide, 'code'))}</code></pre></div></div>${footer}</div>`
      );
    }
    case 'summary': {
      const items = records(slide.items).map((item) => (
        '<div class="summary-item">'
        + `<div class="summary-item-title">${escapeHtml(text(item, 'title'))}</div>`
        + `<div class="summary-item-desc">${escapeHtml(text(item, 'desc'))}</div></div>`
      )).join('');
      return (
        `<div class="slide-content summary">${header}<div class="slide-body">`
        + `<div class="summary-list">${items}</div></div>${footer}</div>`
      );
    }
    case 'metrics': {
      const metrics = records(slide.metrics).map((item) => (
        '<div class="metric-card">'
        + `<div class="metric-value">${escapeHtml(text(item, 'value'))}</div>`
        + `<div class="metric-label">${escapeHtml(text(item, 'label'))}</div></div>`
      )).join('');
      return (
        `<div class="slide-content metrics">${header}`
        + `<div class="slide-body">${metrics}</div>${footer}</div>`
      );
    }
    case 'process': {
      const steps = records(slide.steps).map((item, stepIndex) => (
        '<div class="process-step">'
        + `<div class="process-number">${stepIndex + 1}</div>`
        + `<div class="process-title">${escapeHtml(text(item, 'title'))}</div>`
        + `<div class="process-desc">${escapeHtml(text(item, 'desc'))}</div></div>`
      )).join('');
      return (
        `<div class="slide-content process">${header}`
        + `<div class="slide-body">${steps}</div>${footer}</div>`
      );
    }
    case 'table': {
      const columns = strings(slide.columns)
        .map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join('');
      const rows = (slide.rows as string[][]).map((row) => (
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
      )).join('');
      return (
        `<div class="slide-content table_slide">${header}<div class="slide-body">`
        + `<table><thead><tr>${columns}</tr></thead><tbody>${rows}</tbody></table>`
        + `</div>${footer}</div>`
      );
    }
    case 'timeline': {
      const events = records(slide.events).map((item) => (
        '<div class="timeline-event">'
        + `<div class="timeline-label">${escapeHtml(text(item, 'label'))}</div>`
        + `<div class="timeline-title">${escapeHtml(text(item, 'title'))}</div>`
        + `<div class="timeline-desc">${escapeHtml(text(item, 'desc'))}</div></div>`
      )).join('');
      return (
        `<div class="slide-content timeline">${header}`
        + `<div class="slide-body">${events}</div>${footer}</div>`
      );
    }
    case 'references': {
      const items = records(slide.items).map((item) => (
        '<li class="reference-item">'
        + `<span>${escapeHtml(text(item, 'label'))}</span>`
        + `<a href="${escapeHtml(text(item, 'url'))}">`
        + `${escapeHtml(text(item, 'url'))}</a></li>`
      )).join('');
      return (
        `<div class="slide-content references">${header}<div class="slide-body">`
        + `<ol>${items}</ol></div>${footer}</div>`
      );
    }
    default:
      throw new DeckLatticeError(`unhandled slide type: ${String(type)}`);
  }
}

export function renderSlide(
  slide: BaseSlide,
  index: number,
  total: number,
  deckTitle: string,
  sectionNumber?: number
): string {
  const classes = slide.additional_classes?.join(' ') ?? '';
  const classAttribute = classes ? ` class="${escapeHtml(classes)}"` : '';
  const body = renderBody(slide, index, total, deckTitle, sectionNumber);
  const notes = slide.speaker_note
    ? `<aside class="notes">${escapeHtml(slide.speaker_note)}</aside>`
    : '';
  return (
    `<section data-slide-id="${escapeHtml(slide.id)}"${classAttribute}>`
    + `${body}${notes}</section>`
  );
}
