#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { buildCommand } from './commands/build.js';
import { initCommand } from './commands/init.js';
import { pdfCommand } from './commands/pdf.js';
import { screenshotCommand } from './commands/screenshot.js';
import { validateCommand } from './commands/validate.js';
import { verifyCommand } from './commands/verify.js';
import { templateCommand } from './commands/template.js';
import { updateSkillCommand } from './commands/skill.js';
import { DeckLatticeError } from './core/errors.js';
import { packageRoot } from './package.js';

const HELP = `decklattice

Usage:
  decklattice init [directory] [--force] [--skills]
  decklattice validate [directory]
  decklattice build [directory]
  decklattice verify [directory]
  decklattice pdf [directory] [--output <path>]
  decklattice screenshot [directory] --slide <number|id> [--output <path>]
  decklattice template <html|css>
  decklattice skill update [directory]
  decklattice --version
  decklattice --help

When directory is omitted, the current directory is used. Commands other than
init search parent directories for decklattice.config.json or deck/slides.json.
`;

interface ParsedArguments {
  command?: string;
  subcommand?: string;
  directory?: string;
  force: boolean;
  skills: boolean;
  output?: string;
  slide?: string;
  help: boolean;
  version: boolean;
}

function parseArguments(argv: string[]): ParsedArguments {
  const result: ParsedArguments = {
    force: false,
    skills: false,
    help: false,
    version: false
  };
  const positional: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--force') {
      result.force = true;
    } else if (argument === '--skills') {
      result.skills = true;
    } else if (argument === '--help' || argument === '-h') {
      result.help = true;
    } else if (argument === '--version' || argument === '-v') {
      result.version = true;
    } else if (argument === '--output' || argument === '-o') {
      const value = argv[index + 1];
      if (!value || value.startsWith('-')) {
        throw new DeckLatticeError(`${argument} requires a path`);
      }
      result.output = value;
      index += 1;
    } else if (argument === '--slide' || argument === '-s') {
      const value = argv[index + 1];
      if (!value || value.startsWith('-')) {
        throw new DeckLatticeError(`${argument} requires a slide number or id`);
      }
      result.slide = value;
      index += 1;
    } else if (argument.startsWith('-')) {
      throw new DeckLatticeError(`Unknown option: ${argument}`);
    } else {
      positional.push(argument);
    }
  }
  if (positional[0] === 'skill') {
    if (positional.length > 3) {
      throw new DeckLatticeError(`Unexpected argument: ${positional[3]}`);
    }
    [result.command, result.subcommand, result.directory] = positional;
    return result;
  }
  if (positional.length > 2) {
    throw new DeckLatticeError(`Unexpected argument: ${positional[2]}`);
  }
  [result.command, result.directory] = positional;
  return result;
}

async function version(): Promise<string> {
  const packageJson = JSON.parse(
    await readFile(`${packageRoot()}/package.json`, 'utf8')
  ) as { version: string };
  return packageJson.version;
}

async function main(): Promise<void> {
  const arguments_ = parseArguments(process.argv.slice(2));
  if (arguments_.help || (!arguments_.command && !arguments_.version)) {
    console.log(HELP);
    return;
  }
  if (arguments_.version) {
    console.log(await version());
    return;
  }

  switch (arguments_.command) {
    case 'init':
      await initCommand(arguments_.directory, arguments_.force, arguments_.skills);
      break;
    case 'validate':
      await validateCommand(arguments_.directory);
      break;
    case 'build':
      await buildCommand(arguments_.directory);
      break;
    case 'verify':
      await verifyCommand(arguments_.directory);
      break;
    case 'pdf':
      await pdfCommand(arguments_.directory, arguments_.output);
      break;
    case 'screenshot':
      if (!arguments_.slide) {
        throw new DeckLatticeError('screenshot requires --slide <number|id>');
      }
      await screenshotCommand(
        arguments_.slide,
        arguments_.directory,
        arguments_.output
      );
      break;
    case 'template':
      await templateCommand(arguments_.directory);
      break;
    case 'skill':
      if (arguments_.subcommand !== 'update') {
        throw new DeckLatticeError('skill requires update');
      }
      await updateSkillCommand(arguments_.directory);
      break;
    default:
      throw new DeckLatticeError(`Unknown command: ${arguments_.command}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = error instanceof DeckLatticeError ? 1 : 2;
});
