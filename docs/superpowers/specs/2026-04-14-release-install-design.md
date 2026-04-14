# ZGLM Release Install Design

**Date:** 2026-04-14

## Goal

Ship ZGLM through GitHub Releases so users can install it with `curl | bash`, run `zglm` from anywhere on macOS and Linux, and remove the installation with `zglm --uninstall confirm`.

## Approach

Use GitHub Actions to build portable release bundles per target platform and architecture. Each bundle contains:

- a bundled Node runtime
- the CLI app `dist`
- production `node_modules`
- a small launcher script at `bin/zglm`
- a bundle manifest

Users install through a generated `install.sh` release asset. The installer downloads the matching release bundle, extracts it into `~/.local/share/zglm/<version>`, creates `~/.local/bin/zglm`, and updates the user's shell rc file when `~/.local/bin` is not already on `PATH`.

The installer also writes an installation metadata file. The CLI uninstall command reads that metadata and removes:

- the installed bundle directory
- the `~/.local/bin/zglm` symlink
- the managed PATH block from touched shell rc files
- the install metadata file

It does not delete user config, session data, or API keys.

## Targets

- Linux x64
- Linux arm64
- macOS x64
- macOS arm64

Windows is explicitly out of scope.

## Bundle Layout

Each extracted bundle will use this structure:

```text
<install-dir>/
  app/
    dist/
    node_modules/
    package.json
  bin/
    zglm
  runtime/
    node
  manifest.json
```

The launcher script resolves symlinks, locates the bundle root, and executes:

```bash
<install-dir>/runtime/node <install-dir>/app/dist/index.js "$@"
```

## Release Flow

The release workflow runs on tag pushes like `v1.2.3`.

1. Run quality checks.
2. Build a platform-specific portable bundle on each native runner.
3. Archive each bundle as `zglm-<platform>-<arch>.tar.gz`.
4. Generate a concrete `install.sh` with the repository name baked in.
5. Publish a GitHub Release containing all archives and the installer script.

## CLI Changes

Add `--uninstall <confirm>` to the top-level CLI. When the argument is exactly `confirm`, uninstall the managed installation and exit before API key checks or interactive startup.

Add a small installation utility module to:

- compute install metadata paths
- render and strip managed PATH blocks
- read and delete install metadata
- remove installed files safely

## Testing

Add unit tests for:

- install metadata path helpers
- PATH block removal
- shell rc file selection heuristics

Keep release packaging logic deterministic and smoke-testable through local script execution.
