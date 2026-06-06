import { dirname, relative } from 'node:path';
import { chromium, type Page } from 'playwright';
import { DeckLatticeError } from '../core/errors.js';
import type { ProjectContext, VerificationIssue } from '../core/types.js';
import { startServer } from './server.js';

async function collectSlideIssues(page: Page): Promise<VerificationIssue[]> {
  return page.evaluate(async () => {
    interface RevealApi {
      getSlides(): HTMLElement[];
      getIndices(slide: HTMLElement): { h: number; v?: number };
      slide(horizontal: number, vertical?: number): void;
    }
    const reveal = (window as unknown as { Reveal: RevealApi }).Reveal;
    const results: VerificationIssue[] = [];
    for (const slide of reveal.getSlides()) {
      const indices = reveal.getIndices(slide);
      reveal.slide(indices.h, indices.v);
      await new Promise<void>((resolveFrame) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
      });

      const content = slide.querySelector<HTMLElement>('.slide-content');
      if (
        content
        && (
          content.scrollWidth > content.clientWidth + 1
          || content.scrollHeight > content.clientHeight + 1
        )
      ) {
        results.push({
          slide: slide.dataset.slideId,
          issue: 'overflow',
          client: [content.clientWidth, content.clientHeight],
          scroll: [content.scrollWidth, content.scrollHeight]
        });
      }
      for (const image of slide.querySelectorAll('img')) {
        if (!image.complete || image.naturalWidth === 0) {
          results.push({
            slide: slide.dataset.slideId,
            issue: 'image-load',
            src: image.src
          });
        }
        if (!image.alt.trim()) {
          results.push({
            slide: slide.dataset.slideId,
            issue: 'missing-alt',
            src: image.src
          });
        }
      }
    }
    return results;
  });
}

export async function verifyProject(
  project: ProjectContext,
  log: (message: string) => void = console.log
): Promise<void> {
  const server = await startServer(dirname(project.outputPath));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const issues: VerificationIssue[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        issues.push({ issue: 'console-error', message: message.text() });
      }
    });
    page.on('pageerror', (error) => {
      issues.push({ issue: 'page-error', message: error.message });
    });
    page.on('response', (response) => {
      if (response.status() >= 400) {
        issues.push({
          issue: 'response-error',
          message: `${response.status()} ${response.url()}`
        });
      }
    });

    const outputName = relative(dirname(project.outputPath), project.outputPath);
    await page.goto(`${server.url}/${outputName}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => {
      const reveal = (window as unknown as {
        Reveal?: { isReady(): boolean };
      }).Reveal;
      return reveal?.isReady();
    });
    issues.push(...await collectSlideIssues(page));
    if (issues.length > 0) {
      throw new DeckLatticeError(
        `Slide verification failed:\n${JSON.stringify(issues, null, 2)}`
      );
    }
    log('Slide verification passed');
  } finally {
    await browser.close();
    await server.close();
  }
}
