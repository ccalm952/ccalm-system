-- Rename OrthodonticsCategory enum values to match UI labels
ALTER TYPE "OrthodonticsCategory" RENAME VALUE 'active' TO 'treating';
ALTER TYPE "OrthodonticsCategory" RENAME VALUE 'removed' TO 'completed';
