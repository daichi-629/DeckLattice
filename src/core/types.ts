export interface DeckLatticeConfig {
  deckDir: string;
  output: string;
  pdfOutput: string;
}

export interface ProjectContext {
  rootDir: string;
  deckDir: string;
  slidesPath: string;
  outputPath: string;
  patchesDir: string;
  pdfOutputPath: string;
  config: DeckLatticeConfig;
}

export interface BaseSlide {
  id: string;
  type: SlideType;
  headline?: string;
  speaker_note?: string;
  additional_classes?: string[];
  [key: string]: unknown;
}

export type SlideType =
  | 'title'
  | 'section'
  | 'message'
  | 'two_column'
  | 'three_column'
  | 'image_right'
  | 'image_left'
  | 'full_image'
  | 'chart'
  | 'mermaid'
  | 'math'
  | 'quote'
  | 'code'
  | 'summary'
  | 'metrics'
  | 'process'
  | 'table'
  | 'timeline'
  | 'references'
  | 'v2-hero'
  | 'v2-section'
  | 'v2-full'
  | 'v2-sidebar-right'
  | 'v2-sidebar-left'
  | 'v2-columns-2'
  | 'v2-columns-3'
  | 'v2-header-body';

export interface DeckData {
  deck_title: string;
  short_title?: string;
  lang?: string;
  audience?: string;
  tone?: string;
  additional_css?: string[];
  slides: BaseSlide[];
}

export interface VerificationIssue {
  slide?: string;
  issue: string;
  message?: string;
  src?: string;
  client?: [number, number];
  scroll?: [number, number];
}
