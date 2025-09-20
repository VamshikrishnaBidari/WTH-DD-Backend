-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "isReviewed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isReviewed" BOOLEAN NOT NULL DEFAULT true;
