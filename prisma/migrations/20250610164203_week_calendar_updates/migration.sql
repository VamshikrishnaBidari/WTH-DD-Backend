/*
  Warnings:

  - You are about to drop the column `rescheduledSlots` on the `weekCalendarUser` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "weekCalendarUser" DROP COLUMN "rescheduledSlots",
ADD COLUMN     "originalSlots" TEXT[];
