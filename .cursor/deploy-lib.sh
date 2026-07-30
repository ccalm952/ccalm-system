#!/usr/bin/env bash
# 部署脚本公共逻辑：SSH、远程执行、版本校验、健康检查。
# 由 deploy-web / deploy-api / deploy-all / deploy 引用，勿直接执行。

set -euo pipefail

DEPLOY_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_ROOT_DIR="$(cd "$DEPLOY_LIB_DIR/.." && pwd)"

DEPLOY_KEY_PATH="${DEPLOY_SSH_KEY_PATH:-${HOME}/.ssh/ccalm_deploy}"
DEPLOY_TARGET="${DEPLOY_SSH_TARGET:-${DEPLOY_SSH_USER:-root}@${DEPLOY_SSH_HOST:-106.53.206.11}}"
DEPLOY_PROJECT_DIR="${DEPLOY_PROJECT_DIR:-/opt/ccalm-system}"
DEPLOY_WEB_ROOT="${DEPLOY_WEB_ROOT:-/opt/1panel/www/sites/www.ccalm.xyz/index}"
DEPLOY_GIT_REMOTE="${DEPLOY_GIT_REMOTE:-https://github.com/ccalm952/ccalm-system}"
DEPLOY_GIT_BRANCH="${DEPLOY_GIT_BRANCH:-master}"
DEPLOY_API_HEALTH_URL="${DEPLOY_API_HEALTH_URL:-http://127.0.0.1:3000/api/auth/me}"
DEPLOY_PM2_APP="${DEPLOY_PM2_APP:-ccalm-api}"

deploy_setup_ssh() {
  bash "$DEPLOY_LIB_DIR/setup-deploy-ssh.sh"
  DEPLOY_KEY_PATH="${DEPLOY_SSH_KEY_PATH:-${HOME}/.ssh/ccalm_deploy}"
  DEPLOY_TARGET="${DEPLOY_SSH_TARGET:-${DEPLOY_SSH_USER:-root}@${DEPLOY_SSH_HOST:-106.53.206.11}}"

  if [[ ! -f "$DEPLOY_KEY_PATH" ]]; then
    echo "缺少部署密钥 ${DEPLOY_KEY_PATH}。请在 Cursor Secrets 或 GitHub Secrets 配置 DEPLOY_SSH_KEY。" >&2
    exit 1
  fi
}

deploy_ssh_opts() {
  DEPLOY_SSH_OPTS=(
    -i "$DEPLOY_KEY_PATH"
    -o IdentitiesOnly=yes
    -o BatchMode=yes
    -o StrictHostKeyChecking=accept-new
  )
}

deploy_ssh() {
  deploy_ssh_opts
  ssh "${DEPLOY_SSH_OPTS[@]}" "$DEPLOY_TARGET" "$@"
}

deploy_expected_sha() {
  if [[ -n "${DEPLOY_EXPECTED_SHA:-}" ]]; then
    printf '%s\n' "$DEPLOY_EXPECTED_SHA"
    return
  fi
  if [[ -n "${GITHUB_SHA:-}" ]]; then
    printf '%s\n' "$GITHUB_SHA"
    return
  fi
  git -C "$DEPLOY_ROOT_DIR" fetch --quiet "$DEPLOY_GIT_REMOTE" "$DEPLOY_GIT_BRANCH"
  git -C "$DEPLOY_ROOT_DIR" rev-parse "FETCH_HEAD"
}

deploy_remote_pull() {
  local expected_sha="$1"
  deploy_ssh "set -euo pipefail
cd ${DEPLOY_PROJECT_DIR}
git fetch ${DEPLOY_GIT_REMOTE} ${DEPLOY_GIT_BRANCH}
git checkout -B ${DEPLOY_GIT_BRANCH} FETCH_HEAD
git reset --hard ${expected_sha}
if command -v corepack >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
  corepack prepare pnpm@11.18.0 --activate >/dev/null 2>&1 || true
fi
export PATH=\"/root/.local/share/pnpm/bin:\$PATH\"
pnpm install --frozen-lockfile || pnpm install
echo \"remote HEAD=\$(git rev-parse HEAD) pnpm=\$(pnpm -v)\"
"
}

deploy_verify_remote_sha() {
  local expected_sha="$1"
  local remote_sha
  remote_sha="$(deploy_ssh "cd ${DEPLOY_PROJECT_DIR} && git rev-parse HEAD")"
  remote_sha="${remote_sha//$'\r'/}"
  if [[ "$remote_sha" != "$expected_sha" ]]; then
    echo "版本校验失败：服务器 HEAD=${remote_sha}，期望=${expected_sha}" >&2
    exit 1
  fi
  echo "版本校验通过：${remote_sha}"
}

deploy_write_version_stamp() {
  local expected_sha="$1"
  local mode="$2"
  deploy_ssh "set -euo pipefail
mkdir -p ${DEPLOY_WEB_ROOT}
cat > ${DEPLOY_WEB_ROOT}/deploy-version.json <<EOF
{
  \"sha\": \"${expected_sha}\",
  \"mode\": \"${mode}\",
  \"deployedAt\": \"\$(date -Is)\"
}
EOF
"
}

deploy_healthcheck_api() {
  local code
  code="$(deploy_ssh "curl -s -o /dev/null -w '%{http_code}' ${DEPLOY_API_HEALTH_URL} || true")"
  code="${code//$'\r'/}"
  # 未登录应为 401；偶发 200 也表示服务可用
  if [[ "$code" != "401" && "$code" != "200" ]]; then
    echo "API 健康检查失败：${DEPLOY_API_HEALTH_URL} -> HTTP ${code}" >&2
    deploy_ssh "pm2 logs ${DEPLOY_PM2_APP} --lines 30 --nostream" || true
    exit 1
  fi
  echo "API 健康检查通过：HTTP ${code}"
}

deploy_classify_scope() {
  # stdin: 变更文件列表（相对仓库根），stdout: web | api | all | none
  local has_web=0
  local has_api=0
  local has_other=0
  local path

  while IFS= read -r path || [[ -n "$path" ]]; do
    [[ -z "$path" ]] && continue
    case "$path" in
      ccalm-web/*|ccalm-web)
        has_web=1
        ;;
      ccalm-api/*|ccalm-api|pnpm-lock.yaml|package.json|pnpm-workspace.yaml)
        has_api=1
        ;;
      .cursor/deploy*.sh|.cursor/deploy-lib.sh|.github/workflows/*)
        # 部署脚本变更：默认全量，避免半套脚本
        has_api=1
        has_web=1
        ;;
      README.md|.cursor/rules/*|.cursor/environment.json|.cursor/install.sh|.cursor/setup-deploy-ssh.sh|.gitignore)
        ;;
      *)
        has_other=1
        ;;
    esac
  done

  if (( has_api && has_web )); then
    echo all
  elif (( has_api )); then
    echo api
  elif (( has_web )); then
    echo web
  elif (( has_other )); then
    echo all
  else
    echo none
  fi
}

deploy_changed_files_between() {
  local before_sha="$1"
  local after_sha="$2"
  if [[ -z "$before_sha" || "$before_sha" =~ ^0+$ ]]; then
    # 无法 diff 时视为全量
    printf 'ccalm-api/\nccalm-web/\n'
    return
  fi
  if ! git -C "$DEPLOY_ROOT_DIR" cat-file -e "${before_sha}^{commit}" 2>/dev/null; then
    git -C "$DEPLOY_ROOT_DIR" fetch --quiet "$DEPLOY_GIT_REMOTE" "$DEPLOY_GIT_BRANCH" || true
  fi
  if ! git -C "$DEPLOY_ROOT_DIR" cat-file -e "${before_sha}^{commit}" 2>/dev/null; then
    printf 'ccalm-api/\nccalm-web/\n'
    return
  fi
  git -C "$DEPLOY_ROOT_DIR" diff --name-only "${before_sha}" "${after_sha}"
}

deploy_remote_api() {
  deploy_ssh "set -euo pipefail
cd ${DEPLOY_PROJECT_DIR}
export PATH=\"/root/.local/share/pnpm/bin:\$PATH\"
cd ccalm-api
pnpm exec prisma generate
pnpm exec prisma migrate deploy
rm -rf dist
pnpm run build
test -f dist/src/main.js
pm2 restart ${DEPLOY_PM2_APP}
pm2 save
"
}

deploy_remote_web() {
  deploy_ssh "set -euo pipefail
cd ${DEPLOY_PROJECT_DIR}
export PATH=\"/root/.local/share/pnpm/bin:\$PATH\"
pnpm --dir ccalm-web build
test -f ccalm-web/dist/index.html
rm -rf ${DEPLOY_WEB_ROOT}/*
cp -r ccalm-web/dist/* ${DEPLOY_WEB_ROOT}/
"
}
