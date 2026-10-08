export const TEST_DATABASE_NAME = "ccalm_test";

export function databaseNameFromUrl(databaseUrl) {
  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL 无法解析");
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("测试账号种子只接受 PostgreSQL");
  }
  const name = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!name) throw new Error("DATABASE_URL 缺少数据库名");
  return name;
}

export function assertTestDatabaseUrl(databaseUrl) {
  const name = databaseNameFromUrl(databaseUrl);
  if (name !== TEST_DATABASE_NAME) {
    throw new Error(
      `拒绝写入：当前数据库是 ${name}，测试账号只能写入 ${TEST_DATABASE_NAME}`,
    );
  }
  return name;
}
