/*
  Warnings:

  - A unique constraint covering the columns `[courseId]` on the table `UserCalendar` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `weekCalendarUser` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserCalendar_courseId_key" ON "UserCalendar"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "weekCalendarUser_userId_key" ON "weekCalendarUser"("userId");
