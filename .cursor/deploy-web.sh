#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bash "$ROOT_DIR/.cursor/setup-deploy-ssh.sh"

KEY_PATH="${DEPLOY_SSH_KEY_PATH:-${HOME}/.ssh/ccalm_deploy}"
TARGET="${DEPLOY_SSH_TARGET:-${DEPLOY_SSH_USER:-root}@${DEPLOY_SSH_HOST:-106.53.206.11}}"
PROJECT_DIR="${DEPLOY_PROJECT_DIR:-/opt/ccalm-system}"
WEB_ROOT="${DEPLOY_WEB_ROOT:-/opt/1panel/www/sites/www.ccalm.xyz/index}"
GIT_REMOTE="${DEPLOY_GIT_REMOTE:-https://github.com/ccalm952/ccalm-system}"
GIT_BRANCH="${DEPLOY_GIT_BRANCH:-master}"

if [[ ! -f "$KEY_PATH" ]]; then
  echo "缺少部署密钥 ${KEY_PATH}。请在 Cursor Secrets 配置 DEPLOY_SSH_KEY 后重启 Agent。" >&2
  exit 1
fi

SSH_OPTS=(
  -i "$KEY_PATH"
  -o IdentitiesOnly=yes
  -o BatchMode=yes
  -o StrictHostKeyChecking=accept-new
)

REMOTE_CMD=$(cat <<EOF
set -euo pipefail
cd ${PROJECT_DIR}
git pull ${GIT_REMOTE} ${GIT_BRANCH}
export PATH="/root/.local/share/pnpm/bin:\$PATH"
pnpm --dir ccalm-web build
rm -rf ${WEB_ROOT}/*
cp -r ccalm-web/dist/* ${WEB_ROOT}/
echo "deploy ok: \$(date -Is)"
EOF
)

ssh "${SSH_OPTS[@]}" "$TARGET" "$REMOTE_CMD"
