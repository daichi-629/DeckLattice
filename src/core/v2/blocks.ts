import { escapeHtml, inlineMarkdown } from '../html.js';
import { sanitizeSvg } from '../svg.js';
import type {
  V2Block,
  BulletsBlock, TextBlock, QuoteBlock, ImageBlock, CodeBlock,
  ChartBlock, MermaidBlock, MathBlock, MetricsBlock, TimelineBlock, TableBlock
} from './types.js';

function renderBullets(b: BulletsBlock): string {
  return `<ul class="v2-bullets">${b.items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`;
}

function renderText(b: TextBlock): string {
  return `<p class="v2-text">${inlineMarkdown(b.content)}</p>`;
}

function renderQuote(b: QuoteBlock): string {
  return (
    '<figure class="v2-quote">'
    + `<blockquote>${escapeHtml(b.quote)}</blockquote>`
    + (b.author ? `<figcaption>&#x2014; ${escapeHtml(b.author)}</figcaption>` : '')
    + '</figure>'
  );
}

function renderImage(b: ImageBlock): string {
  const parts = [
    b.caption ? escapeHtml(b.caption) : '',
    b.source  ? `Source: ${escapeHtml(b.source)}` : ''
  ].filter(Boolean);
  const figcaption = parts.length > 0 ? `<figcaption>${parts.join(' | ')}</figcaption>` : '';
  return (
    '<figure class="v2-image">'
    + `<img src="${escapeHtml(b.url)}" alt="${escapeHtml(b.alt)}">`
    + figcaption
    + '</figure>'
  );
}

function renderCode(b: CodeBlock): string {
  const lang = b.language ?? 'plaintext';
  const lineAttr = b.highlight_lines ? ` data-line-numbers="${escapeHtml(b.highlight_lines)}"` : '';
  return (
    '<div class="v2-code"><pre>'
    + `<code class="language-${escapeHtml(lang)}"${lineAttr}>${escapeHtml(b.code)}</code>`
    + '</pre></div>'
  );
}

function renderChart(b: ChartBlock): string {
  if (b.config) {
    const cfg = JSON.stringify(b.config)
      .replaceAll('&', '\\u0026')
      .replaceAll('<', '\\u003c')
      .replaceAll('>', '\\u003e');
    return (
      '<div class="v2-chart">'
      + `<canvas data-chart-config="${escapeHtml(cfg)}" `
      + `role="img" aria-label="${escapeHtml(b.alt ?? '')}"></canvas>`
      + '</div>'
    );
  }
  if (b.svg) return `<div class="v2-chart">${sanitizeSvg(b.svg)}</div>`;
  return '<div class="v2-chart v2-chart--placeholder"></div>';
}

function renderMermaid(b: MermaidBlock): string {
  return `<div class="v2-mermaid"><pre class="mermaid">${escapeHtml(b.diagram)}</pre></div>`;
}

function renderMath(b: MathBlock): string {
  return `<div class="v2-math">${escapeHtml(b.equation)}</div>`;
}

function renderMetrics(b: MetricsBlock): string {
  const cards = b.items.map((m) => (
    '<div class="v2-metric-card">'
    + `<div class="v2-metric-value">${escapeHtml(m.value)}</div>`
    + `<div class="v2-metric-label">${escapeHtml(m.label)}</div>`
    + '</div>'
  )).join('');
  return `<div class="v2-metrics">${cards}</div>`;
}

function renderTimeline(b: TimelineBlock): string {
  const events = b.events.map((ev) => (
    '<div class="v2-timeline-event">'
    + `<div class="v2-timeline-label">${escapeHtml(ev.label)}</div>`
    + `<div class="v2-timeline-title">${escapeHtml(ev.title)}</div>`
    + `<div class="v2-timeline-desc">${escapeHtml(ev.desc)}</div>`
    + '</div>'
  )).join('');
  return `<div class="v2-timeline">${events}</div>`;
}

function renderTable(b: TableBlock): string {
  const ths = b.columns.map((c) => `<th scope="col">${escapeHtml(c)}</th>`).join('');
  const trs = b.rows.map((row) => (
    `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
  )).join('');
  return (
    '<div class="v2-table">'
    + `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`
    + '</div>'
  );
}

export function renderBlock(block: V2Block): string {
  switch (block.type) {
    case 'bullets':  return renderBullets(block);
    case 'text':     return renderText(block);
    case 'quote':    return renderQuote(block);
    case 'image':    return renderImage(block);
    case 'code':     return renderCode(block);
    case 'chart':    return renderChart(block);
    case 'mermaid':  return renderMermaid(block);
    case 'math':     return renderMath(block);
    case 'metrics':  return renderMetrics(block);
    case 'timeline': return renderTimeline(block);
    case 'table':    return renderTable(block);
  }
}
