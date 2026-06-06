import { buildProject } from '../core/build.js';
import { resolveProject } from '../core/project.js';

export async function validateCommand(directory?: string): Promise<void> {
  const project = await resolveProject(directory);
  await buildProject(project, { validateOnly: true });
}
