import {
  mkdir,
  readFile,
  stat,
  writeFile
} from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { applyPatch } from './patch.js';
import { renderSlide } from './renderer.js';
import { escapeHtml } from './html.js';
import { DeckLatticeError } from './errors.js';
import { validateDeck } from './validation.js';
import type { DeckData, ProjectContext } from './types.js';

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
  for (const [offset, slide] of data.slides.entries()) {
    let output = renderSlide(slide, offset + 1, data.slides.length, data.deck_title);
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

  let template: string;
  try {
    template = await readFile(project.templatePath, 'utf8');
  } catch {
    throw new DeckLatticeError(
      `${relative(project.rootDir, project.templatePath)} not found`
    );
  }
  const placeholders = [
    '{{ deck_title }}',
    '{{ lang }}',
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
  return template
    .replace('{{ deck_title }}', escapeHtml(data.deck_title))
    .replace('{{ lang }}', escapeHtml(data.lang ?? 'ja'))
    .replace('{{ additional_css }}', cssLinks)
    .replace('{{ slides_html }}', slides.join('\n'));
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
