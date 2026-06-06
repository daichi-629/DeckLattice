import { DeckLatticeError } from './errors.js';

export function applyPatch(sourceText: string, patchText: string): string {
  const sourceLines = sourceText.split(/\r?\n/);
  const patchLines = patchText.split(/\r?\n/);
  if (patchLines.at(-1) === '') patchLines.pop();
  const result: string[] = [];
  let sourceIndex = 0;
  let patchIndex = 0;
  let sawHunk = false;

  while (patchIndex < patchLines.length) {
    const line = patchLines[patchIndex];
    if (line.startsWith('--- ') || line.startsWith('+++ ')) {
      patchIndex += 1;
      continue;
    }
    if (!line.startsWith('@@')) {
      if (line.trim()) {
        throw new DeckLatticeError(`unexpected patch line: ${JSON.stringify(line)}`);
      }
      patchIndex += 1;
      continue;
    }

    const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (!match) {
      throw new DeckLatticeError(`invalid patch hunk header: ${JSON.stringify(line)}`);
    }

    sawHunk = true;
    const oldStart = Number(match[1]) - 1;
    const oldLength = Number(match[2] ?? '1');
    const newLength = Number(match[4] ?? '1');
    if (oldStart < sourceIndex || oldStart > sourceLines.length) {
      throw new DeckLatticeError(`patch hunk starts outside source: ${JSON.stringify(line)}`);
    }

    result.push(...sourceLines.slice(sourceIndex, oldStart));
    sourceIndex = oldStart;
    patchIndex += 1;
    let consumed = 0;
    let produced = 0;

    while (
      patchIndex < patchLines.length
      && !patchLines[patchIndex].startsWith('@@')
    ) {
      const patchLine = patchLines[patchIndex];
      if (patchLine.startsWith('\\ No newline')) {
        patchIndex += 1;
        continue;
      }
      if (!patchLine || !' +-'.includes(patchLine[0])) {
        throw new DeckLatticeError(`invalid patch content: ${JSON.stringify(patchLine)}`);
      }

      const marker = patchLine[0];
      const content = patchLine.slice(1);
      if (marker === ' ' || marker === '-') {
        const actual = sourceLines[sourceIndex] ?? '<EOF>';
        if (actual !== content) {
          throw new DeckLatticeError(
            `patch context mismatch: expected ${JSON.stringify(content)}, `
            + `found ${JSON.stringify(actual)}`
          );
        }
        sourceIndex += 1;
        consumed += 1;
      }
      if (marker === ' ' || marker === '+') {
        result.push(content);
        produced += 1;
      }
      patchIndex += 1;
    }

    if (consumed !== oldLength || produced !== newLength) {
      throw new DeckLatticeError(
        `patch hunk length mismatch: expected -${oldLength}/+${newLength}, `
        + `got -${consumed}/+${produced}`
      );
    }
  }

  if (!sawHunk) {
    throw new DeckLatticeError('patch contains no hunks');
  }
  result.push(...sourceLines.slice(sourceIndex));
  return result.join('\n');
}
