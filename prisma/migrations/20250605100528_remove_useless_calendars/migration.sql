/*
  Warnings:

  - You are about to drop the `UserCalendar` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `teacherCalendar` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `weekCalendarTeacher` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserCalendar" DROP CONSTRAINT "UserCalendar_courseId_fkey";

-- DropForeignKey
ALTER TABLE "teacherCalendar" DROP CONSTRAINT "teacherCalendar_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "weekCalendarTeacher" DROP CONSTRAINT "weekCalendarTeacher_teacherId_fkey";

-- DropTable
DROP TABLE "UserCalendar";

-- DropTable
DROP TABLE "teacherCalendar";

-- DropTable
DROP TABLE "weekCalendarTeacher";
