import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import type { ProjectContext, DeckLatticeConfig } from './types.js';
import { DeckLatticeError } from './errors.js';

const CONFIG_NAME = 'decklattice.config.json';

const DEFAULT_CONFIG: DeckLatticeConfig = {
  deckDir: 'deck',
  output: 'deck/index.html',
  pdfOutput: 'deck/output/slides.pdf'
};

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function findProjectRoot(startDirectory: string): Promise<string> {
  let current = resolve(startDirectory);
  while (true) {
    if (
      await exists(resolve(current, CONFIG_NAME))
      || await exists(resolve(current, DEFAULT_CONFIG.deckDir, 'slides.json'))
    ) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      throw new DeckLatticeError(
        `No decklattice project found from ${resolve(startDirectory)}`
      );
    }
    current = parent;
  }
}

function resolveFromRoot(rootDir: string, value: string): string {
  return isAbsolute(value) ? value : resolve(rootDir, value);
}

export async function resolveProject(
  startDirectory = process.cwd()
): Promise<ProjectContext> {
  const rootDir = await findProjectRoot(startDirectory);
  const configPath = resolve(rootDir, CONFIG_NAME);
  let config = DEFAULT_CONFIG;

  if (await exists(configPath)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readFile(configPath, 'utf8'));
    } catch (error) {
      throw new DeckLatticeError(`Invalid ${CONFIG_NAME}: ${String(error)}`);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new DeckLatticeError(`${CONFIG_NAME} must contain a JSON object`);
    }
    const candidate = parsed as Partial<DeckLatticeConfig>;
    config = {
      deckDir: candidate.deckDir ?? DEFAULT_CONFIG.deckDir,
      output: candidate.output ?? DEFAULT_CONFIG.output,
      pdfOutput: candidate.pdfOutput ?? DEFAULT_CONFIG.pdfOutput
    };
    for (const [key, value] of Object.entries(config)) {
      if (typeof value !== 'string' || value.trim() === '') {
        throw new DeckLatticeError(`${CONFIG_NAME}.${key} must be a non-empty string`);
      }
    }
  }

  const deckDir = resolveFromRoot(rootDir, config.deckDir);
  const outputPath = resolveFromRoot(rootDir, config.output);
  if (dirname(outputPath) !== deckDir) {
    throw new DeckLatticeError(
      `${CONFIG_NAME}.output must point to an HTML file directly inside deckDir`
    );
  }
  return {
    rootDir,
    deckDir,
    slidesPath: resolve(deckDir, 'slides.json'),
    outputPath,
    patchesDir: resolve(deckDir, 'patches'),
    pdfOutputPath: resolveFromRoot(rootDir, config.pdfOutput),
    config
  };
}
