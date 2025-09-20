-- AlterTable
ALTER TABLE "Calendar" ADD COLUMN     "addClassSlots" TEXT[];

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "weekClassLimit" INTEGER NOT NULL DEFAULT 8;

-- AlterTable
ALTER TABLE "weekCalendarUser" ADD COLUMN     "addClassSlots" TEXT[];
