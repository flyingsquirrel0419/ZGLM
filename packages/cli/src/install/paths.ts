import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import {
  lstat,
  readdir,
  mkdir,
  readFile,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';

export interface InstallLocations {
  binDir: string;
  installRoot: string;
  metadataPath: string;
}

export interface InstallMetadata {
  version: string;
  installDir: string;
  binLink: string;
  rcFiles: string[];
}

export interface PerformUninstallOptions {
  homeDir?: string;
  confirmation: string;
}

const PATH_BLOCK_START = '# >>> zglm install >>>';
const PATH_BLOCK_END = '# <<< zglm install <<<';

export function getDefaultInstallLocations(homeDir: string = homedir()): InstallLocations {
  const installRoot = join(homeDir, '.local', 'share', 'zglm');
  return {
    binDir: join(homeDir, '.local', 'bin'),
    installRoot,
    metadataPath: join(installRoot, 'install.json'),
  };
}

export function renderManagedPathBlock(binDir: string): string {
  return [
    PATH_BLOCK_START,
    `export PATH="${binDir}:$PATH"`,
    PATH_BLOCK_END,
  ].join('\n');
}

export function stripManagedPathBlock(content: string): string {
  const escapedStart = PATH_BLOCK_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = PATH_BLOCK_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`${escapedStart}\\n[\\s\\S]*?\\n${escapedEnd}\\n?`, 'g');
  return content.replace(pattern, '');
}

export function selectRcFile(shellPath: string, existingPaths: string[], homeDir: string): string {
  const shellName = basename(shellPath);
  const preferred = shellName === 'zsh'
    ? ['.zshrc', '.bashrc', '.profile']
    : ['.bashrc', '.zshrc', '.profile'];

  for (const candidate of preferred) {
    const fullPath = join(homeDir, candidate);
    if (existingPaths.includes(fullPath)) {
      return fullPath;
    }
  }

  return join(homeDir, preferred[0]);
}

export async function writeInstallMetadata(path: string, metadata: InstallMetadata): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(metadata, null, 2), 'utf-8');
}

export async function readInstallMetadata(path: string): Promise<InstallMetadata | null> {
  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as InstallMetadata;
  } catch {
    return null;
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch {
    return false;
  }
}

async function removeManagedBlocks(rcFiles: string[]): Promise<void> {
  for (const rcFile of rcFiles) {
    try {
      const content = await readFile(rcFile, 'utf-8');
      const stripped = stripManagedPathBlock(content);
      if (stripped !== content) {
        await writeFile(rcFile, stripped, 'utf-8');
      }
    } catch {
      continue;
    }
  }
}

export async function performUninstall(options: PerformUninstallOptions): Promise<boolean> {
  if (options.confirmation !== 'confirm') {
    throw new Error('Uninstall requires the exact confirmation string: confirm');
  }

  const locations = getDefaultInstallLocations(options.homeDir);
  const metadata = await readInstallMetadata(locations.metadataPath);
  const currentLink = join(locations.installRoot, 'current');

  if (!metadata) {
    return false;
  }

  await removeManagedBlocks(metadata.rcFiles);

  if (await pathExists(metadata.binLink)) {
    await unlink(metadata.binLink).catch(async () => {
      await rm(metadata.binLink, { force: true });
    });
  }

  if (await pathExists(metadata.installDir)) {
    await rm(metadata.installDir, { recursive: true, force: true });
  }

  await rm(currentLink, { force: true });

  await rm(locations.metadataPath, { force: true });

  try {
    const entries = await readdir(locations.installRoot);
    if (entries.length === 0) {
      await rm(locations.installRoot, { recursive: true, force: true });
    }
  } catch {
    return true;
  }

  return true;
}
