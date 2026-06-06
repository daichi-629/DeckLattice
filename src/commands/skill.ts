import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { packageRoot } from '../package.js';
import { resolveProject } from '../core/project.js';

export async function updateSkillCommand(directory?: string): Promise<void> {
  const project = await resolveProject(directory);
  const source = resolve(packageRoot(), '.skills/decklattice');
  const destination = resolve(project.rootDir, '.skills/decklattice');

  await rm(destination, { recursive: true, force: true });
  await mkdir(resolve(project.rootDir, '.skills'), { recursive: true });
  await cp(source, destination, { recursive: true });
  console.log('Updated agent skill: .skills/decklattice');
}
