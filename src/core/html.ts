import beautify from 'js-beautify';
import escapeHtmlLib from 'escape-html';

export function escapeHtml(value: unknown): string {
  return escapeHtmlLib(String(value));
}


export function inlineMarkdown(raw: string): string {
  return escapeHtml(raw)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

export function formatHtml(html: string): string {
  return beautify.html(html, {
    indent_size: 2,
    indent_char: ' ',
    max_preserve_newlines: 1,
    preserve_newlines: true,
    end_with_newline: false,
    wrap_line_length: 0,
    indent_inner_html: false,
    unformatted: ['pre', 'code'],
    content_unformatted: ['pre', 'code'],
    extra_liners: []
  });
}


