export interface DeckLatticeConfig {
  deckDir: string;
  output: string;
  pdfOutput: string;
}

export interface ProjectContext {
  rootDir: string;
  deckDir: string;
  slidesPath: string;
  templatePath: string;
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
  | 'full_image'
  | 'chart'
  | 'quote'
  | 'code'
  | 'summary'
  | 'metrics'
  | 'process'
  | 'table'
  | 'timeline'
  | 'references';

export interface DeckData {
  deck_title: string;
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
