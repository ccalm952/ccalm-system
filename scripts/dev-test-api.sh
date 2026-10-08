#!/usr/bin/env bash
# 启动独立测试库和测试 API。不读取生产库连接串。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

docker compose -f docker-compose.test.yml up -d --wait

export DATABASE_URL="postgresql://ccalm:ccalm_test@127.0.0.1:5433/ccalm_test?schema=public"
export PORT="${TEST_API_PORT:-3001}"
export JWT_SECRET="${TEST_JWT_SECRET:-test-only-jwt-secret-do-not-use-in-production}"
export SALARY_PIN="${TEST_SALARY_PIN:-0000}"
export CORS_ORIGINS=""

if [[ -f ccalm-api/.env ]]; then
  appid="$(grep -E '^WECHAT_APPID=' ccalm-api/.env | tail -n1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
  secret="$(grep -E '^WECHAT_APPSECRET=' ccalm-api/.env | tail -n1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
  if [[ -n "${appid}" ]]; then export WECHAT_APPID="$appid"; fi
  if [[ -n "${secret}" ]]; then export WECHAT_APPSECRET="$secret"; fi
fi

pnpm -C ccalm-api exec prisma migrate deploy
node ccalm-api/prisma/seed-test-user.mjs
exec pnpm -C ccalm-api start:dev
