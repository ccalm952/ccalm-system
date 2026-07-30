#!/usr/bin/env bash
# GitHub Actions 专用部署入口。
# 环境变量：
#   DEPLOY_SCOPE=web|api|all|auto  （默认 auto）
#   DEPLOY_BEFORE_SHA
#   DEPLOY_EXPECTED_SHA / GITHUB_SHA
#   DEPLOY_SSH_KEY_PATH / DEPLOY_SSH_HOST / DEPLOY_SSH_USER
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=.github/scripts/deploy-lib.sh
source "$ROOT_DIR/.github/scripts/deploy-lib.sh"

SCOPE="${DEPLOY_SCOPE:-auto}"

deploy_setup_ssh

EXPECTED_SHA="$(deploy_expected_sha)"
export DEPLOY_EXPECTED_SHA="$EXPECTED_SHA"

if [[ "$SCOPE" == "auto" ]]; then
  BEFORE_SHA="${DEPLOY_BEFORE_SHA:-}"
  if [[ -z "$BEFORE_SHA" ]]; then
    BEFORE_SHA="$(deploy_ssh "cd ${DEPLOY_PROJECT_DIR} && git rev-parse HEAD" || true)"
    BEFORE_SHA="${BEFORE_SHA//$'\r'/}"
  fi
  echo "自动判定范围：${BEFORE_SHA:-<empty>} → ${EXPECTED_SHA}"
  CHANGED="$(deploy_changed_files_between "$BEFORE_SHA" "$EXPECTED_SHA" || true)"
  if [[ -n "$CHANGED" ]]; then
    echo "变更文件："
    printf '%s\n' "$CHANGED" | sed 's/^/  /'
  else
    echo "无文件变更"
  fi
  SCOPE="$(printf '%s\n' "$CHANGED" | deploy_classify_scope)"
  echo "判定结果：${SCOPE}"
fi

if [[ "$SCOPE" == "none" ]]; then
  remote_sha="$(deploy_ssh "cd ${DEPLOY_PROJECT_DIR} && git rev-parse HEAD" || true)"
  remote_sha="${remote_sha//$'\r'/}"
  if [[ "$remote_sha" == "$EXPECTED_SHA" ]]; then
    echo "无需部署：服务器已是 ${EXPECTED_SHA}"
    exit 0
  fi
  echo "服务器 HEAD=${remote_sha:-未知}，期望=${EXPECTED_SHA}，改为全量部署"
  SCOPE=all
fi

case "$SCOPE" in
  web) deploy_run_web "$EXPECTED_SHA" ;;
  api) deploy_run_api "$EXPECTED_SHA" ;;
  all) deploy_run_all "$EXPECTED_SHA" ;;
  *)
    echo "未知 DEPLOY_SCOPE=${SCOPE}，请使用 web|api|all|auto" >&2
    exit 1
    ;;
esac
