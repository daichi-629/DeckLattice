import { dirname, relative, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { DeckLatticeError } from '../core/errors.js';
import type { DeckData, ProjectContext } from '../core/types.js';
import { startServer } from './server.js';

interface SlideTarget {
  id: string;
  index: number;
}

function resolveSlide(data: DeckData, selector: string): SlideTarget {
  if (/^[1-9]\d*$/.test(selector)) {
    const index = Number(selector) - 1;
    const slide = data.slides[index];
    if (!slide) {
      throw new DeckLatticeError(
        `slide number ${selector} is out of range (1-${data.slides.length})`
      );
    }
    return { id: slide.id, index };
  }

  const index = data.slides.findIndex((slide) => slide.id === selector);
  if (index === -1) {
    throw new DeckLatticeError(`slide id not found: ${selector}`);
  }
  return { id: data.slides[index].id, index };
}

export async function captureScreenshot(
  project: ProjectContext,
  data: DeckData,
  selector: string,
  output?: string,
  log: (message: string) => void = console.log
): Promise<string> {
  const target = resolveSlide(data, selector);
  const outputPath = output
    ? resolve(project.rootDir, output)
    : resolve(project.deckDir, 'output', `${target.id}.png`);
  await mkdir(dirname(outputPath), { recursive: true });

  const server = await startServer(dirname(project.outputPath));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1
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
    await page.evaluate((slideIndex) => {
      const reveal = (window as unknown as {
        Reveal: { slide(horizontal: number): void };
      }).Reveal;
      reveal.slide(slideIndex);
    }, target.index);
    await page.waitForFunction((slideId) => {
      const current = document.querySelector<HTMLElement>(
        '.slides > section.present'
      );
      return current?.dataset.slideId === slideId;
    }, target.id);
    await page.evaluate(() => new Promise<void>((resolveFrame) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
    }));
    await page.screenshot({
      path: outputPath,
      type: 'png',
      fullPage: false
    });
    log(`Screenshot captured: ${relative(project.rootDir, outputPath)}`);
    return outputPath;
  } finally {
    await browser.close();
    await server.close();
  }
}

export { resolveSlide };
