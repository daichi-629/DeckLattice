import { dirname, relative } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import type { ProjectContext } from '../core/types.js';
import { startServer } from './server.js';

export async function exportPdf(
  project: ProjectContext,
  outputPath = project.pdfOutputPath,
  log: (message: string) => void = console.log
): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });
  const server = await startServer(dirname(project.outputPath));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const outputName = relative(dirname(project.outputPath), project.outputPath);
    await page.goto(`${server.url}/${outputName}?print-pdf`, {
      waitUntil: 'networkidle'
    });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => {
      const reveal = (window as unknown as {
        Reveal?: { isReady(): boolean };
      }).Reveal;
      return reveal?.isReady();
    });
    await page.pdf({
      path: outputPath,
      width: '13.333333in',
      height: '7.5in',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    log(`PDF exported: ${relative(project.rootDir, outputPath)}`);
  } finally {
    await browser.close();
    await server.close();
  }
}
