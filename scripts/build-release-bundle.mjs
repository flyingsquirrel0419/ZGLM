#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function normalizePlatform(value) {
  if (value === 'darwin' || value === 'linux') return value;
  if (value === 'macos') return 'darwin';
  throw new Error(`Unsupported platform: ${value}`);
}

function normalizeArch(value) {
  if (value === 'x64' || value === 'arm64') return value;
  if (value === 'amd64' || value === 'x86_64') return 'x64';
  if (value === 'aarch64') return 'arm64';
  throw new Error(`Unsupported architecture: ${value}`);
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = parseArgs(process.argv.slice(2));
const rootPackage = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf-8'));
const version = args.version ?? rootPackage.version;
const platform = normalizePlatform(args.platform ?? process.platform);
const arch = normalizeArch(args.arch ?? process.arch);

const releaseRoot = join(repoRoot, 'dist', 'release');
const stageRoot = join(releaseRoot, `stage-${platform}-${arch}`);
const archivePath = join(releaseRoot, `zglm-${platform}-${arch}.tar.gz`);
const manifest = {
  name: 'zglm',
  version,
  platform,
  arch,
  builtAt: new Date().toISOString(),
};

rmSync(stageRoot, { recursive: true, force: true });
rmSync(archivePath, { force: true });
mkdirSync(join(stageRoot, 'bin'), { recursive: true });
mkdirSync(join(stageRoot, 'runtime'), { recursive: true });
mkdirSync(releaseRoot, { recursive: true });

execFileSync(
  'pnpm',
  ['--filter', '@zglm/cli', 'deploy', '--prod', join(stageRoot, 'app')],
  {
    cwd: repoRoot,
    stdio: 'inherit',
  },
);

copyFileSync(process.execPath, join(stageRoot, 'runtime', 'node'));
chmodSync(join(stageRoot, 'runtime', 'node'), 0o755);

copyFileSync(join(repoRoot, 'scripts', 'zglm-launcher.sh'), join(stageRoot, 'bin', 'zglm'));
chmodSync(join(stageRoot, 'bin', 'zglm'), 0o755);

writeFileSync(join(stageRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');

execFileSync(
  'tar',
  ['-czf', archivePath, '-C', stageRoot, '.'],
  {
    cwd: repoRoot,
    stdio: 'inherit',
  },
);

process.stdout.write(`${archivePath}\n`);
