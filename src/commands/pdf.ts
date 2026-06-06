import { resolve } from 'node:path';
import { exportPdf } from '../browser/pdf.js';
import { verifyProject } from '../browser/verify.js';
import { buildProject } from '../core/build.js';
import { resolveProject } from '../core/project.js';

export async function pdfCommand(
  directory?: string,
  output?: string
): Promise<void> {
  const project = await resolveProject(directory);
  await buildProject(project);
  await verifyProject(project);
  await exportPdf(
    project,
    output ? resolve(project.rootDir, output) : project.pdfOutputPath
  );
}
