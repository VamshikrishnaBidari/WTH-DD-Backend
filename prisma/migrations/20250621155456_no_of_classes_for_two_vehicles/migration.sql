/*
  Warnings:

  - You are about to drop the column `noOfClasses` on the `CourseCombo` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CourseCombo" DROP COLUMN "noOfClasses",
ADD COLUMN     "noOfClassesV1" INTEGER,
ADD COLUMN     "noOfClassesV2" INTEGER;
