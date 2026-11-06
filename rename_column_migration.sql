-- Migration script to rename creePar to managerId
ALTER TABLE "Users" RENAME COLUMN "creePar" TO "managerId";
