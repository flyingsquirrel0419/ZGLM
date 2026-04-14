# Release Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GitHub Releases packaging, a `curl | bash` installer, and `zglm --uninstall confirm` for macOS and Linux.

**Architecture:** Build portable bundles from the CLI package, publish them through GitHub Releases, and install them into a user-local versioned directory with a stable symlink in `~/.local/bin`. Persist install metadata so the CLI can uninstall the managed installation without touching user data.

**Tech Stack:** GitHub Actions, bash installer, Node.js scripts, Commander CLI, Vitest

---

### Task 1: Add install helper tests

**Files:**
- Create: `packages/cli/tests/install.test.ts`
- Create: `packages/cli/src/install/paths.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import {
  getDefaultInstallLocations,
  renderManagedPathBlock,
  stripManagedPathBlock,
  selectRcFile,
} from '../src/install/paths.js';

describe('install paths', () => {
  it('computes default install locations under the user home', () => {
    const paths = getDefaultInstallLocations('/tmp/home');
    expect(paths.binDir).toBe('/tmp/home/.local/bin');
    expect(paths.installRoot).toBe('/tmp/home/.local/share/zglm');
    expect(paths.metadataPath).toBe('/tmp/home/.local/share/zglm/install.json');
  });

  it('adds and removes the managed PATH block', () => {
    const block = renderManagedPathBlock('/tmp/home/.local/bin');
    const original = '# shell rc\n' + block + '\nexport FOO=1\n';
    expect(stripManagedPathBlock(original)).toBe('# shell rc\nexport FOO=1\n');
  });

  it('selects a shell rc file based on shell and existing files', () => {
    const rc = selectRcFile('/bin/zsh', ['/tmp/home/.zshrc', '/tmp/home/.profile'], '/tmp/home');
    expect(rc).toBe('/tmp/home/.zshrc');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- packages/cli/tests/install.test.ts`
Expected: FAIL with module not found for `../src/install/paths.js`

- [ ] **Step 3: Write minimal implementation**

Create pure helper functions in `packages/cli/src/install/paths.ts` to satisfy the tests.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- packages/cli/tests/install.test.ts`
Expected: PASS

### Task 2: Implement uninstall support in the CLI

**Files:**
- Modify: `packages/cli/src/index.ts`
- Create: `packages/cli/src/install/uninstall.ts`
- Modify: `packages/cli/tests/install.test.ts`

- [ ] **Step 1: Write the failing test**

Extend the install test file with a case that creates a temporary install root, metadata file, symlink path, and rc file, then asserts that uninstall removes the managed artifacts while preserving unrelated rc content.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- packages/cli/tests/install.test.ts`
Expected: FAIL because `performUninstall` does not exist or does not clean the filesystem correctly

- [ ] **Step 3: Write minimal implementation**

Add uninstall logic that:

- reads metadata from the default metadata path
- requires the exact string `confirm`
- removes the symlink and install directory
- strips the managed PATH block from touched rc files
- deletes the metadata file

Wire `--uninstall <confirm>` into the CLI before API key checks.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- packages/cli/tests/install.test.ts`
Expected: PASS

### Task 3: Build portable release bundles

**Files:**
- Create: `scripts/build-release-bundle.mjs`
- Create: `scripts/zglm-launcher.sh`
- Modify: `package.json`

- [ ] **Step 1: Write the failing smoke expectation**

Define the intended bundle layout in a simple smoke test or script assertion:

```bash
node scripts/build-release-bundle.mjs --platform linux --arch x64 --version 0.1.0
test -f dist/release/zglm-linux-x64.tar.gz
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/build-release-bundle.mjs --platform linux --arch x64 --version 0.1.0`
Expected: FAIL because the script does not exist

- [ ] **Step 3: Write minimal implementation**

Implement a release builder that:

- runs `pnpm --filter @zglm/cli deploy --prod <temp>/app`
- copies the current Node binary into `<temp>/runtime/node`
- copies the launcher into `<temp>/bin/zglm`
- writes `manifest.json`
- archives the bundle as `dist/release/zglm-<platform>-<arch>.tar.gz`

- [ ] **Step 4: Run the smoke check**

Run:

```bash
pnpm build
node scripts/build-release-bundle.mjs --platform linux --arch x64 --version 0.1.0
tar -tzf dist/release/zglm-linux-x64.tar.gz | sed -n '1,20p'
```

Expected: archive contains `app/`, `bin/zglm`, `runtime/node`, and `manifest.json`

### Task 4: Add the curl installer template

**Files:**
- Create: `scripts/install.template.sh`

- [ ] **Step 1: Write the failing smoke expectation**

Document the expected installer behavior:

- detect `darwin`/`linux` and `x64`/`arm64`
- download the matching release asset
- install into `~/.local/share/zglm/<version>`
- link `~/.local/bin/zglm`
- append a managed PATH block when needed
- write install metadata

- [ ] **Step 2: Run shell validation to verify it fails**

Run: `bash -n scripts/install.template.sh`
Expected: FAIL because the file does not exist

- [ ] **Step 3: Write minimal implementation**

Create a portable bash installer template with baked-in repository placeholder `__REPO__`.

- [ ] **Step 4: Run shell validation**

Run: `bash -n scripts/install.template.sh`
Expected: PASS

### Task 5: Publish releases from GitHub Actions

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Write the workflow**

Add a release workflow that:

- triggers on `v*` tags
- runs lint/test/build once
- builds bundles on native macOS/Linux runners
- uploads the archives as artifacts
- generates a repo-specific `install.sh`
- publishes a GitHub Release with all assets

- [ ] **Step 2: Validate the workflow syntax**

Run: `sed -n '1,260p' .github/workflows/release.yml`
Expected: workflow contains test gate, matrix packaging jobs, and release publishing step

### Task 6: Verify end-to-end

**Files:**
- Modify only if verification uncovers issues

- [ ] **Step 1: Run the full local verification**

Run:

```bash
pnpm test
pnpm lint
pnpm build
node scripts/build-release-bundle.mjs --platform "$(uname | tr '[:upper:]' '[:lower:]')" --arch "$(uname -m)" --version 0.1.0
bash -n scripts/install.template.sh
```

Expected: all commands pass

- [ ] **Step 2: Review the generated diff**

Run: `git diff -- . ':(exclude)dist'`
Expected: only deployment-related source, workflow, script, and test changes
