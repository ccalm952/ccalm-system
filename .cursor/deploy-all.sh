#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=.cursor/deploy-lib.sh
source "$ROOT_DIR/.cursor/deploy-lib.sh"

deploy_setup_ssh

EXPECTED_SHA="$(deploy_expected_sha)"
echo "全量部署 → ${DEPLOY_TARGET}（期望 SHA=${EXPECTED_SHA}）"

deploy_remote_pull "$EXPECTED_SHA"
deploy_verify_remote_sha "$EXPECTED_SHA"
deploy_remote_api
deploy_healthcheck_api
deploy_remote_web
deploy_write_version_stamp "$EXPECTED_SHA" "all"

echo "deploy-all ok: $(date -Is) sha=${EXPECTED_SHA}"
