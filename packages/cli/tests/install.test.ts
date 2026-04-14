import { afterEach, describe, expect, it } from 'vitest';
import { lstat, mkdtemp, mkdir, readFile, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import {
  getDefaultInstallLocations,
  renderManagedPathBlock,
  stripManagedPathBlock,
  selectRcFile,
  writeInstallMetadata,
  readInstallMetadata,
  performUninstall,
} from '../src/install/paths.js';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('install paths', () => {
  it('computes default install locations under the user home', () => {
    const paths = getDefaultInstallLocations('/tmp/home');
    expect(paths.binDir).toBe('/tmp/home/.local/bin');
    expect(paths.installRoot).toBe('/tmp/home/.local/share/zglm');
    expect(paths.metadataPath).toBe('/tmp/home/.local/share/zglm/install.json');
  });

  it('adds and removes the managed PATH block', () => {
    const block = renderManagedPathBlock('/tmp/home/.local/bin');
    const original = `# shell rc\n${block}\nexport FOO=1\n`;
    expect(stripManagedPathBlock(original)).toBe('# shell rc\nexport FOO=1\n');
  });

  it('selects a shell rc file based on shell and existing files', () => {
    const rc = selectRcFile('/bin/zsh', ['/tmp/home/.zshrc', '/tmp/home/.profile'], '/tmp/home');
    expect(rc).toBe('/tmp/home/.zshrc');
  });
});

describe('performUninstall', () => {
  it('removes the managed install and leaves unrelated rc content intact', async () => {
    const root = await mkdtemp(join(tmpdir(), 'zglm-install-test-'));
    tempDirs.push(root);

    const homeDir = join(root, 'home');
    const installDir = join(homeDir, '.local', 'share', 'zglm', '0.1.0');
    const binDir = join(homeDir, '.local', 'bin');
    const binLink = join(binDir, 'zglm');
    const currentLink = join(homeDir, '.local', 'share', 'zglm', 'current');
    const rcFile = join(homeDir, '.zshrc');
    const metadataPath = join(homeDir, '.local', 'share', 'zglm', 'install.json');

    await mkdir(join(installDir, 'bin'), { recursive: true });
    await mkdir(binDir, { recursive: true });
    await writeFile(join(installDir, 'bin', 'zglm'), '#!/usr/bin/env bash\n', 'utf-8');
    await symlink(installDir, currentLink);
    await symlink(join(installDir, 'bin', 'zglm'), binLink);
    await writeFile(
      rcFile,
      `export FOO=1\n${renderManagedPathBlock(binDir)}\nexport BAR=1\n`,
      'utf-8',
    );

    await writeInstallMetadata(metadataPath, {
      version: '0.1.0',
      installDir,
      binLink,
      rcFiles: [rcFile],
    });

    const before = await readInstallMetadata(metadataPath);
    expect(before?.installDir).toBe(installDir);

    await performUninstall({ homeDir, confirmation: 'confirm' });

    expect(await readInstallMetadata(metadataPath)).toBeNull();
    await expect(readFile(rcFile, 'utf-8')).resolves.toBe('export FOO=1\nexport BAR=1\n');
    await expect(lstat(currentLink)).rejects.toBeDefined();
  });
});
