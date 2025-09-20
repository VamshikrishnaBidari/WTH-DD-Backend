/*
  Warnings:

  - You are about to drop the column `Lisense` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LicenseProcess" ADD COLUMN     "dlLicenseReceived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dlTestResult" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "Lisense",
ADD COLUMN     "License" "LicenseStatus" DEFAULT 'Pending';
