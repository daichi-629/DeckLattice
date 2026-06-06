import { renderSingleSlideHtml } from '../core/build.js';
import { resolveProject } from '../core/project.js';

export async function htmlBeforeCommand(
  selector: string,
  directory?: string
): Promise<void> {
  const project = await resolveProject(directory);
  const html = await renderSingleSlideHtml(project, selector, false);
  console.log(html);
}
