import {
  access,
  cp,
  mkdir,
  readdir
} from 'node:fs/promises';
import { constants } from 'node:fs';
import { relative, resolve } from 'node:path';
import { DeckLatticeError } from '../core/errors.js';
import { packageRoot } from '../package.js';

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(directory: string, root = directory): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(path, root));
    } else if (entry.isFile()) {
      files.push(relative(root, path));
    }
  }
  return files;
}

async function copyDirectoryContents(
  source: string,
  destination: string,
  force: boolean
): Promise<void> {
  await mkdir(destination, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    await cp(
      resolve(source, entry.name),
      resolve(destination, entry.name),
      {
        recursive: entry.isDirectory(),
        force,
        errorOnExist: !force
      }
    );
  }
}

export async function initCommand(
  directory = process.cwd(),
  force = false,
  includeSkills = false
): Promise<void> {
  const destination = resolve(directory);
  const template = resolve(packageRoot(), 'templates/default');
  const skillSource = resolve(packageRoot(), '.skills/decklattice');
  const skillDestination = resolve(destination, '.skills/decklattice');
  const filesToCreate = (await listFiles(template)).map((file) => ({
    source: resolve(template, file),
    destination: resolve(destination, file),
    display: file
  }));
  if (includeSkills) {
    filesToCreate.push(
      ...(await listFiles(skillSource)).map((file) => ({
        source: resolve(skillSource, file),
        destination: resolve(skillDestination, file),
        display: `.skills/decklattice/${file}`
      }))
    );
  }
  const collisions: string[] = [];

  for (const file of filesToCreate) {
    if (await exists(file.destination)) collisions.push(file.display);
  }
  if (collisions.length > 0 && !force) {
    throw new DeckLatticeError(
      `Refusing to overwrite existing files:\n${collisions.map((file) => `- ${file}`).join('\n')}`
    );
  }

  await copyDirectoryContents(template, destination, force);
  if (includeSkills) {
    await copyDirectoryContents(skillSource, skillDestination, force);
  }
  await mkdir(resolve(destination, 'deck', 'patches'), { recursive: true });
  console.log(`Initialized DeckLattice project: ${destination}`);
  if (includeSkills) {
    console.log('Installed agent skill: .skills/decklattice');
  }
}
