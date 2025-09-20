/*
  Warnings:

  - You are about to drop the column `dlLicenseReceived` on the `LicenseProcess` table. All the data in the column will be lost.
  - You are about to drop the column `dlTestResult` on the `LicenseProcess` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DLAppn" ADD COLUMN     "oldDlnumber" TEXT;

-- AlterTable
ALTER TABLE "LicenseProcess" DROP COLUMN "dlLicenseReceived",
DROP COLUMN "dlTestResult",
ALTER COLUMN "documentVerification" DROP NOT NULL,
ALTER COLUMN "documentVerification" DROP DEFAULT,
ALTER COLUMN "llApplication" DROP NOT NULL,
ALTER COLUMN "llApplication" DROP DEFAULT,
ALTER COLUMN "llTestBooking" DROP NOT NULL,
ALTER COLUMN "llTestBooking" DROP DEFAULT,
ALTER COLUMN "llTestDay" DROP NOT NULL,
ALTER COLUMN "llTestDay" DROP DEFAULT,
ALTER COLUMN "dlApplication" DROP NOT NULL,
ALTER COLUMN "dlApplication" DROP DEFAULT,
ALTER COLUMN "dlTestBooking" DROP NOT NULL,
ALTER COLUMN "dlTestBooking" DROP DEFAULT,
ALTER COLUMN "dlTestDay" DROP NOT NULL,
ALTER COLUMN "dlTestDay" DROP DEFAULT;
