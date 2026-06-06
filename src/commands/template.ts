import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DeckLatticeError } from '../core/errors.js';
import { packageRoot } from '../package.js';

const TEMPLATE_FILES = {
  html: 'template.html',
  css: 'styles.css'
} as const;

export async function templateCommand(kind?: string): Promise<void> {
  if (kind !== 'html' && kind !== 'css') {
    throw new DeckLatticeError('template requires html or css');
  }
  const path = resolve(packageRoot(), 'templates/runtime', TEMPLATE_FILES[kind]);
  process.stdout.write(await readFile(path, 'utf8'));
}
