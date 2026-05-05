-- Lowercase user roles: USER/ADMIN -> user/admin

ALTER TYPE "UserRole" RENAME TO "UserRole_old";

CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

ALTER TABLE "User"
ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User"
ALTER COLUMN "role" TYPE "UserRole"
USING (LOWER("role"::text))::"UserRole";

ALTER TABLE "User"
ALTER COLUMN "role" SET DEFAULT 'user';

DROP TYPE "UserRole_old";

