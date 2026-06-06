import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';

const cli = resolve('dist/cli.js');

function run(arguments_: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [cli, ...arguments_], {
      cwd: resolve('.'),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolveRun({ stdout, stderr });
      else reject(new Error(`CLI exited ${code}\n${stdout}\n${stderr}`));
    });
  });
}

test('init, validate and build work in an arbitrary directory', async () => {
  const parent = await mkdtemp(resolve(tmpdir(), 'decklattice-cli-'));
  const project = resolve(parent, 'presentation');
  await run(['init', project]);
  await run(['validate', project]);
  const result = await run(['build', project]);

  assert.match(result.stdout, /Built: deck\/index\.html/);
  assert.equal((await stat(resolve(project, 'deck/index.html'))).isFile(), true);
  assert.match(
    await readFile(resolve(project, 'deck/index.html'), 'utf8'),
    /Presentation Title/
  );
  await assert.rejects(access(resolve(project, 'deck/template.html')));
  await assert.rejects(access(resolve(project, 'deck/styles.css')));
  assert.match(
    await readFile(resolve(project, 'deck/index.html'), 'utf8'),
    /--color-bg: #ffffff/
  );
  await assert.rejects(access(resolve(project, '.skills/decklattice/SKILL.md')));
});

test('template command prints built-in HTML and CSS', async () => {
  assert.match((await run(['template', 'html'])).stdout, /<!DOCTYPE html>/);
  assert.match((await run(['template', 'css'])).stdout, /--color-bg: #ffffff/);
});

test('init --skills installs the decklattice agent skill', async () => {
  const parent = await mkdtemp(resolve(tmpdir(), 'decklattice-skill-'));
  const project = resolve(parent, 'presentation');
  const result = await run(['init', project, '--skills']);

  assert.match(result.stdout, /Installed agent skill: \.skills\/decklattice/);
  assert.match(
    await readFile(resolve(project, '.skills/decklattice/SKILL.md'), 'utf8'),
    /^---\nname: decklattice\n/m
  );
  assert.match(
    await readFile(
      resolve(project, '.skills/decklattice/agents/openai.yaml'),
      'utf8'
    ),
    /display_name: "DeckLattice"/
  );
});

test('skill update installs and replaces the decklattice agent skill', async () => {
  const parent = await mkdtemp(resolve(tmpdir(), 'decklattice-skill-update-'));
  const project = resolve(parent, 'presentation');
  await run(['init', project]);
  const skillPath = resolve(project, '.skills/decklattice/SKILL.md');

  const installResult = await run(['skill', 'update', project]);
  assert.match(installResult.stdout, /Updated agent skill/);
  assert.match(await readFile(skillPath, 'utf8'), /decklattice template html/);

  await writeFile(skillPath, 'outdated');
  await writeFile(resolve(project, '.skills/decklattice/stale.txt'), 'stale');
  await run(['skill', 'update', project]);

  assert.match(await readFile(skillPath, 'utf8'), /^---\nname: decklattice\n/m);
  await assert.rejects(access(resolve(project, '.skills/decklattice/stale.txt')));
});
