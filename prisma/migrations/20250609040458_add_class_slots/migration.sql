/*
  Warnings:

  - You are about to drop the column `addClassSlots` on the `Calendar` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Calendar" DROP COLUMN "addClassSlots";

-- CreateTable
CREATE TABLE "AddClassSlot" (
    "id" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT,
    "calendarId" TEXT NOT NULL,

    CONSTRAINT "AddClassSlot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AddClassSlot" ADD CONSTRAINT "AddClassSlot_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "Calendar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
