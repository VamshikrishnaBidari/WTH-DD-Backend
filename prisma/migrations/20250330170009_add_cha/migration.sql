/*
  Warnings:

  - You are about to drop the column `pendingAmoutn` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `schoolId` on the `Course` table. All the data in the column will be lost.
  - The `location` column on the `Teacher` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `location` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[email]` on the table `DrivingSchool` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `Course` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicle` to the `Course` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `location` on the `DrivingSchool` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `gender` to the `Teacher` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('TEACHER', 'STUDENT');

-- DropForeignKey
ALTER TABLE "Course" DROP CONSTRAINT "Course_schoolId_fkey";

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "pendingAmoutn",
DROP COLUMN "schoolId",
ADD COLUMN     "classesTaken" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "classesTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pendingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "studentAttendence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "teacherAttendence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "vehicle" TEXT NOT NULL,
ALTER COLUMN "amount" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "DrivingSchool" ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
DROP COLUMN "location",
ADD COLUMN     "location" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "attendence" TIMESTAMP(3)[],
ADD COLUMN     "gender" "genderEnum" NOT NULL,
ADD COLUMN     "refreshToken" TEXT,
DROP COLUMN "location",
ADD COLUMN     "location" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "schoolId" TEXT,
DROP COLUMN "location",
ADD COLUMN     "location" JSONB;

-- CreateTable
CREATE TABLE "Syllabus" (
    "id" TEXT NOT NULL,
    "compId" SERIAL NOT NULL,
    "vehicle" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "classes" INTEGER NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "timePeriod" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Syllabus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slots" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "slotNumber" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "Slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calendar" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "Calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarSlots" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "availableDates" TEXT[],
    "bookedDates" TEXT[],
    "calendarId" TEXT NOT NULL,

    CONSTRAINT "CalendarSlots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" "UserType" NOT NULL,
    "receiverId" TEXT NOT NULL,
    "receiverType" "UserType" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Calendar_teacherId_key" ON "Calendar"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "DrivingSchool_email_key" ON "DrivingSchool"("email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "DrivingSchool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Syllabus" ADD CONSTRAINT "Syllabus_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "DrivingSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slots" ADD CONSTRAINT "Slots_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "DrivingSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calendar" ADD CONSTRAINT "Calendar_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calendar" ADD CONSTRAINT "Calendar_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "DrivingSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSlots" ADD CONSTRAINT "CalendarSlots_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "Calendar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
