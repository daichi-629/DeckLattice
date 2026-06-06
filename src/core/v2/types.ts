export type V2BlockType =
  | 'bullets'
  | 'text'
  | 'quote'
  | 'image'
  | 'code'
  | 'chart'
  | 'mermaid'
  | 'math'
  | 'metrics'
  | 'timeline'
  | 'table';

export interface BulletsBlock { type: 'bullets'; items: string[] }
export interface TextBlock    { type: 'text';    content: string }
export interface QuoteBlock   { type: 'quote';   quote: string; author?: string }

export interface ImageBlock {
  type: 'image';
  url: string;
  alt: string;
  caption?: string;
  source?: string;
}

export interface CodeBlock {
  type: 'code';
  code: string;
  language?: string;
  highlight_lines?: string;
}

export interface ChartConfig { type: string; data: unknown; options?: unknown }
export interface ChartBlock  { type: 'chart'; config?: ChartConfig; svg?: string; alt?: string }

export interface MermaidBlock { type: 'mermaid'; diagram: string }
export interface MathBlock    { type: 'math';    equation: string }

export interface MetricItem   { value: string; label: string }
export interface MetricsBlock { type: 'metrics'; items: MetricItem[] }

export interface TimelineEvent { label: string; title: string; desc: string }
export interface TimelineBlock { type: 'timeline'; events: TimelineEvent[] }

export interface TableBlock { type: 'table'; columns: string[]; rows: string[][] }

export type V2Block =
  | BulletsBlock | TextBlock | QuoteBlock
  | ImageBlock   | CodeBlock | ChartBlock
  | MermaidBlock | MathBlock
  | MetricsBlock | TimelineBlock | TableBlock;

export type V2Slots = Partial<Record<string, V2Block>>;
