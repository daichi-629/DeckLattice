import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, stat } from 'node:fs/promises';
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
  await assert.rejects(access(resolve(project, '.skills/decklattice/SKILL.md')));
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
