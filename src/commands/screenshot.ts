import { captureScreenshot } from '../browser/screenshot.js';
import { buildProject } from '../core/build.js';
import { resolveProject } from '../core/project.js';

export async function screenshotCommand(
  selector: string,
  directory?: string,
  output?: string
): Promise<void> {
  const project = await resolveProject(directory);
  const data = await buildProject(project);
  await captureScreenshot(project, data, selector, output);
}
