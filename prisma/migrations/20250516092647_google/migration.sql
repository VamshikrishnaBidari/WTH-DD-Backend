/*
  Warnings:

  - You are about to drop the column `bookedDates` on the `CalendarSlots` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleType` on the `Syllabus` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[googleId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `classDuration` to the `Course` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expertiseIn` to the `DrivingSchool` table without a default value. This is not possible if the table is not empty.
  - Added the required column `yearsOfExperience` to the `DrivingSchool` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `LLamount` to the `Syllabus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `LicenseAmount` to the `Syllabus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classesAmount` to the `Syllabus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `experience` to the `Teacher` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `day` on the `VehicleSyllabus` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('Pending', 'Completed', 'InProgress');

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('google', 'credentials');

-- AlterTable
ALTER TABLE "CalendarSlots" DROP COLUMN "bookedDates";

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "canceledClasses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "classDuration" INTEGER NOT NULL,
ADD COLUMN     "classesRescheduled" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stars" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "classesTotal" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "DrivingSchool" ADD COLUMN     "dateJoined" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expertiseIn" TEXT NOT NULL,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "yearsOfExperience" INTEGER NOT NULL,
ALTER COLUMN "location" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Syllabus" DROP COLUMN "vehicleType",
ADD COLUMN     "LLamount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "LicenseAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "classesAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "practicalClasses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "theoryClasses" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "canceledClasses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "classesRescheduled" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "experience" INTEGER NOT NULL,
ADD COLUMN     "expertise" TEXT[],
ADD COLUMN     "image" TEXT,
ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "profilePicture" TEXT,
ADD COLUMN     "registrationNumber" TEXT[],
ADD COLUMN     "vehicle" TEXT[],
ALTER COLUMN "teacherId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "Document" "LicenseStatus" DEFAULT 'Pending',
ADD COLUMN     "LL" "LicenseStatus" DEFAULT 'Pending',
ADD COLUMN     "Lisense" "LicenseStatus" DEFAULT 'Pending',
ADD COLUMN     "RTO" "LicenseStatus" DEFAULT 'Pending',
ADD COLUMN     "drivingLicense" TEXT,
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "learnersLicense" TEXT,
ADD COLUMN     "provider" "Provider" NOT NULL DEFAULT 'credentials',
ALTER COLUMN "gender" DROP NOT NULL,
ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable
ALTER TABLE "VehicleSyllabus" ADD COLUMN     "keyPoints" TEXT,
DROP COLUMN "day",
ADD COLUMN     "day" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "email" TEXT NOT NULL,
    "image" TEXT,
    "password" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "refreshToken" TEXT,
    "operatorId" TEXT,
    "expertiseIn" TEXT,
    "workingDays" TEXT,
    "workingHours" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "LLcount" INTEGER NOT NULL DEFAULT 0,
    "DLcount" INTEGER NOT NULL DEFAULT 0,
    "studentsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "workingDays" TEXT NOT NULL,
    "workingHours" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekCalendarUser" (
    "id" TEXT NOT NULL,
    "slots" TEXT[],
    "userId" TEXT NOT NULL,

    CONSTRAINT "weekCalendarUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekCalendarTeacher" (
    "id" TEXT NOT NULL,
    "slots" TEXT[],
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "weekCalendarTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacherCalendar" (
    "id" TEXT NOT NULL,
    "slots" TEXT[],
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "teacherCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCalendar" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "slots" TEXT[],

    CONSTRAINT "UserCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookedDate" (
    "id" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,

    CONSTRAINT "BookedDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklySlot" (
    "id" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,

    CONSTRAINT "WeeklySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT,
    "toUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Operator_email_key" ON "Operator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Operator_schoolId_key" ON "Operator"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "weekCalendarTeacher_teacherId_key" ON "weekCalendarTeacher"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "teacherCalendar_teacherId_key" ON "teacherCalendar"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- AddForeignKey
ALTER TABLE "Operator" ADD CONSTRAINT "Operator_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "DrivingSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekCalendarUser" ADD CONSTRAINT "weekCalendarUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekCalendarTeacher" ADD CONSTRAINT "weekCalendarTeacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacherCalendar" ADD CONSTRAINT "teacherCalendar_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCalendar" ADD CONSTRAINT "UserCalendar_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookedDate" ADD CONSTRAINT "BookedDate_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "CalendarSlots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklySlot" ADD CONSTRAINT "WeeklySlot_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "Calendar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
