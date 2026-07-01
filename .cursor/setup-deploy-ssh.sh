#!/usr/bin/env bash
set -euo pipefail

# 在 Cursor Cloud Agents → Secrets 中配置：
# - DEPLOY_SSH_KEY（Runtime Secret，必填）：SSH 私钥全文
# - DEPLOY_SSH_HOST（可选，默认 106.53.206.11）
# - DEPLOY_SSH_USER（可选，默认 root）

if [[ -z "${DEPLOY_SSH_KEY:-}" ]]; then
  echo "[setup-deploy-ssh] DEPLOY_SSH_KEY 未配置，跳过部署 SSH 初始化。"
  exit 0
fi

SSH_DIR="${HOME}/.ssh"
KEY_PATH="${SSH_DIR}/ccalm_deploy"
HOST="${DEPLOY_SSH_HOST:-106.53.206.11}"
USER="${DEPLOY_SSH_USER:-root}"

mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

umask 077
printf '%b' "$DEPLOY_SSH_KEY" >"$KEY_PATH"
chmod 600 "$KEY_PATH"

KNOWN_HOSTS="${SSH_DIR}/known_hosts"
touch "$KNOWN_HOSTS"
chmod 600 "$KNOWN_HOSTS"
if ! ssh-keygen -F "$HOST" -f "$KNOWN_HOSTS" >/dev/null 2>&1; then
  ssh-keyscan -H "$HOST" >>"$KNOWN_HOSTS" 2>/dev/null || true
fi

export DEPLOY_SSH_TARGET="${USER}@${HOST}"
export DEPLOY_SSH_KEY_PATH="$KEY_PATH"

echo "[setup-deploy-ssh] 已配置 ${DEPLOY_SSH_TARGET}（密钥 ${KEY_PATH}）"
