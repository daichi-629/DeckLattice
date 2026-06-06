import {
  mkdir,
  readFile,
  stat,
  writeFile
} from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import nunjucks from 'nunjucks';
import { applyPatch } from './patch.js';
import { renderSlide } from './renderer.js';
import { escapeHtml, formatHtml } from './html.js';
import { DeckLatticeError } from './errors.js';
import { validateDeck } from './validation.js';
import type { DeckData, ProjectContext } from './types.js';
import { packageRoot } from '../package.js';

export interface BuildOptions {
  validateOnly?: boolean;
  log?: (message: string) => void;
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function loadDeck(project: ProjectContext): Promise<unknown> {
  let source: string;
  try {
    source = await readFile(project.slidesPath, 'utf8');
  } catch {
    throw new DeckLatticeError(
      `${relative(project.rootDir, project.slidesPath)} not found`
    );
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new DeckLatticeError(`invalid JSON: ${String(error)}`);
  }
}

async function renderDeck(
  data: DeckData,
  project: ProjectContext,
  log: (message: string) => void
): Promise<string> {
  const slides: string[] = [];
  let sectionNumber = 0;
  for (const [offset, slide] of data.slides.entries()) {
    if (slide.type === 'section') sectionNumber += 1;
    let output = renderSlide(
      slide,
      offset + 1,
      data.slides.length,
      data.short_title ?? data.deck_title,
      slide.type === 'section' ? sectionNumber : undefined
    );
    output = formatHtml(output);
    const patchPath = resolve(project.patchesDir, `${slide.id}.patch`);
    if (await isFile(patchPath)) {
      try {
        output = applyPatch(output, await readFile(patchPath, 'utf8'));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new DeckLatticeError(
          `failed to apply ${relative(project.rootDir, patchPath)}: ${message}`
        );
      }
      log(`Applied patch: ${relative(project.rootDir, patchPath)}`);
    }
    slides.push(output);
  }

  const runtimeDirectory = resolve(packageRoot(), 'templates/runtime');
  const [template, styles] = await Promise.all([
    readFile(resolve(runtimeDirectory, 'template.html'), 'utf8'),
    readFile(resolve(runtimeDirectory, 'styles.css'), 'utf8')
  ]);
  const placeholders = [
    '{{ deck_title }}',
    '{{ lang }}',
    '{{ styles_css }}',
    '{{ additional_css }}',
    '{{ slides_html }}'
  ];
  const missing = placeholders.filter((placeholder) => !template.includes(placeholder));
  if (missing.length > 0) {
    throw new DeckLatticeError(
      `template is missing placeholders: ${missing.join(', ')}`
    );
  }

  const cssLinks = (data.additional_css ?? [])
    .map((path) => `  <link rel="stylesheet" href="${escapeHtml(path)}">`)
    .join('\n');

  const env = new nunjucks.Environment(null, { autoescape: false });
  return env.renderString(template, {
    deck_title: escapeHtml(data.deck_title),
    lang: escapeHtml(data.lang ?? 'ja'),
    styles_css: styles,
    additional_css: cssLinks,
    slides_html: slides.join('\n')
  });
}

export async function buildProject(
  project: ProjectContext,
  options: BuildOptions = {}
): Promise<DeckData> {
  const log = options.log ?? console.log;
  const data = await validateDeck(await loadDeck(project), project);
  if (options.validateOnly) {
    log('slides.json is valid');
    return data;
  }

  const output = await renderDeck(data, project, log);
  await mkdir(dirname(project.outputPath), { recursive: true });
  await writeFile(project.outputPath, output, 'utf8');
  log(`Built: ${relative(project.rootDir, project.outputPath)}`);
  return data;
}

export interface SlideTarget {
  id: string;
  index: number;
}

export function resolveSlide(data: DeckData, selector: string): SlideTarget {
  if (/^[1-9]\d*$/.test(selector)) {
    const index = Number(selector) - 1;
    const slide = data.slides[index];
    if (!slide) {
      throw new DeckLatticeError(
        `slide number ${selector} is out of range (1-${data.slides.length})`
      );
    }
    return { id: slide.id, index };
  }

  const index = data.slides.findIndex((slide) => slide.id === selector);
  if (index === -1) {
    throw new DeckLatticeError(`slide id not found: ${selector}`);
  }
  return { id: data.slides[index].id, index };
}

export async function renderSingleSlideHtml(
  project: ProjectContext,
  selector: string,
  applyPatchFlag: boolean
): Promise<string> {
  const data = await validateDeck(await loadDeck(project), project);
  const target = resolveSlide(data, selector);
  const slide = data.slides[target.index];

  let sectionNumber = 0;
  for (let i = 0; i <= target.index; i++) {
    if (data.slides[i].type === 'section') {
      sectionNumber += 1;
    }
  }

  let output = renderSlide(
    slide,
    target.index + 1,
    data.slides.length,
    data.short_title ?? data.deck_title,
    slide.type === 'section' ? sectionNumber : undefined
  );

  output = formatHtml(output);

  if (applyPatchFlag) {
    const patchPath = resolve(project.patchesDir, `${slide.id}.patch`);
    if (await isFile(patchPath)) {
      output = applyPatch(output, await readFile(patchPath, 'utf8'));
    }
  }

  return output;
}

