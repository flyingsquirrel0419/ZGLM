#!/usr/bin/env bash
set -euo pipefail

REPO="__REPO__"
REQUESTED_VERSION="${ZGLM_INSTALL_VERSION:-latest}"
PATH_BLOCK_START="# >>> zglm install >>>"
PATH_BLOCK_END="# <<< zglm install <<<"

log() {
  printf '%s\n' "$*"
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

detect_platform() {
  case "$(uname -s)" in
    Linux) printf 'linux' ;;
    Darwin) printf 'darwin' ;;
    *) fail "unsupported operating system: $(uname -s)" ;;
  esac
}

detect_arch() {
  case "$(uname -m)" in
    x86_64|amd64) printf 'x64' ;;
    arm64|aarch64) printf 'arm64' ;;
    *) fail "unsupported architecture: $(uname -m)" ;;
  esac
}

choose_rc_file() {
  local home_dir="$1"
  local shell_name
  shell_name="$(basename "${SHELL:-bash}")"

  if [ "$shell_name" = "zsh" ]; then
    if [ -f "$home_dir/.zshrc" ]; then printf '%s' "$home_dir/.zshrc"; return; fi
    if [ -f "$home_dir/.bashrc" ]; then printf '%s' "$home_dir/.bashrc"; return; fi
    printf '%s' "$home_dir/.zshrc"
    return
  fi

  if [ -f "$home_dir/.bashrc" ]; then printf '%s' "$home_dir/.bashrc"; return; fi
  if [ -f "$home_dir/.zshrc" ]; then printf '%s' "$home_dir/.zshrc"; return; fi
  printf '%s' "$home_dir/.bashrc"
}

append_path_block_if_needed() {
  local bin_dir="$1"
  local rc_file="$2"

  case ":$PATH:" in
    *":$bin_dir:"*) return 0 ;;
  esac

  mkdir -p "$(dirname "$rc_file")"
  touch "$rc_file"

  if grep -q "$PATH_BLOCK_START" "$rc_file"; then
    return 0
  fi

  cat >>"$rc_file" <<EOF

$PATH_BLOCK_START
export PATH="$bin_dir:\$PATH"
$PATH_BLOCK_END
EOF
}

main() {
  local home_dir install_root bin_dir metadata_path bin_link current_link
  local platform arch asset_name base_url download_url
  local tmp_dir archive_path extracted_dir manifest_path version install_dir rc_file previous_install_dir

  home_dir="${HOME:?HOME must be set}"
  install_root="$home_dir/.local/share/zglm"
  bin_dir="$home_dir/.local/bin"
  metadata_path="$install_root/install.json"
  bin_link="$bin_dir/zglm"
  current_link="$install_root/current"

  platform="$(detect_platform)"
  arch="$(detect_arch)"
  asset_name="zglm-${platform}-${arch}.tar.gz"
  base_url="https://github.com/${REPO}/releases"

  if [ "$REQUESTED_VERSION" = "latest" ]; then
    download_url="${base_url}/latest/download/${asset_name}"
  else
    download_url="${base_url}/download/${REQUESTED_VERSION}/${asset_name}"
  fi

  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT

  archive_path="$tmp_dir/$asset_name"
  extracted_dir="$tmp_dir/extracted"
  mkdir -p "$extracted_dir"

  log "Downloading ${asset_name} from ${download_url}"
  curl -fsSL "$download_url" -o "$archive_path"
  tar -xzf "$archive_path" -C "$extracted_dir"

  manifest_path="$extracted_dir/manifest.json"
  [ -f "$manifest_path" ] || fail "bundle manifest missing from downloaded archive"

  version="$(grep -E '"version"' "$manifest_path" | head -n1 | sed -E 's/.*"version":[[:space:]]*"([^"]+)".*/\1/')"
  [ -n "$version" ] || fail "failed to read version from bundle manifest"

  install_dir="$install_root/$version"
  previous_install_dir=""
  if [ -f "$metadata_path" ]; then
    previous_install_dir="$(grep -E '"installDir"' "$metadata_path" | head -n1 | sed -E 's/.*"installDir":[[:space:]]*"([^"]+)".*/\1/' || true)"
  fi
  mkdir -p "$install_root" "$bin_dir"
  rm -rf "$install_dir"
  mkdir -p "$install_dir"
  cp -R "$extracted_dir"/. "$install_dir"/

  ln -sfn "$install_dir" "$current_link"
  ln -sfn "$current_link/bin/zglm" "$bin_link"

  rc_file="$(choose_rc_file "$home_dir")"
  append_path_block_if_needed "$bin_dir" "$rc_file"

  cat >"$metadata_path" <<EOF
{
  "version": "$version",
  "installDir": "$install_dir",
  "binLink": "$bin_link",
  "rcFiles": ["$rc_file"]
}
EOF

  if [ -n "$previous_install_dir" ] && [ "$previous_install_dir" != "$install_dir" ]; then
    rm -rf "$previous_install_dir"
  fi

  log "Installed zglm ${version} to ${install_dir}"
  log "Executable: ${bin_link}"
  if ! command -v zglm >/dev/null 2>&1; then
    log "Open a new shell or run: source \"$rc_file\""
  fi
  log "Uninstall with: zglm --uninstall confirm"
}

main "$@"
