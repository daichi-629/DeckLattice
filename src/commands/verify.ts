import { verifyProject } from '../browser/verify.js';
import { buildProject } from '../core/build.js';
import { resolveProject } from '../core/project.js';

export async function verifyCommand(directory?: string): Promise<void> {
  const project = await resolveProject(directory);
  await buildProject(project);
  await verifyProject(project);
}
