#!/usr/bin/env bash
set -euo pipefail

SOURCE="${BASH_SOURCE[0]:-$0}"

while [ -h "$SOURCE" ]; do
  DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
  TARGET="$(readlink "$SOURCE")"
  if [[ "$TARGET" = /* ]]; then
    SOURCE="$TARGET"
  else
    SOURCE="$DIR/$TARGET"
  fi
done

SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
INSTALL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

exec "$INSTALL_DIR/runtime/node" "$INSTALL_DIR/app/dist/index.js" "$@"
