/*
  Warnings:

  - Added the required column `classStart` to the `Course` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Rating" AS ENUM ('Poor', 'Average', 'Good', 'Moderate', 'Excellent');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "classStart" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "VehicleSyllabus" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "syllabusId" TEXT NOT NULL,

    CONSTRAINT "VehicleSyllabus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VSyllabus" (
    "id" TEXT NOT NULL,
    "vehicle" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VSyllabus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassHistory" (
    "id" TEXT NOT NULL,
    "rating" "Rating" NOT NULL,
    "feedback" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,

    CONSTRAINT "ClassHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VehicleSyllabus" ADD CONSTRAINT "VehicleSyllabus_syllabusId_fkey" FOREIGN KEY ("syllabusId") REFERENCES "VSyllabus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VSyllabus" ADD CONSTRAINT "VSyllabus_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "DrivingSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassHistory" ADD CONSTRAINT "ClassHistory_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
