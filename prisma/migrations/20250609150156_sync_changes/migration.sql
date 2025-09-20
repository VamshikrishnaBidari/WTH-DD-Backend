/*
  Warnings:

  - You are about to drop the column `slotId` on the `BookedDate` table. All the data in the column will be lost.
  - You are about to drop the `CalendarSlots` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `calendarId` to the `BookedDate` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BookedDate" DROP CONSTRAINT "BookedDate_slotId_fkey";

-- DropForeignKey
ALTER TABLE "CalendarSlots" DROP CONSTRAINT "CalendarSlots_calendarId_fkey";

-- AlterTable
ALTER TABLE "BookedDate" DROP COLUMN "slotId",
ADD COLUMN     "calendarId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Calendar" ADD COLUMN     "availableDates" TEXT[];

-- DropTable
DROP TABLE "CalendarSlots";

-- AddForeignKey
ALTER TABLE "BookedDate" ADD CONSTRAINT "BookedDate_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "Calendar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
