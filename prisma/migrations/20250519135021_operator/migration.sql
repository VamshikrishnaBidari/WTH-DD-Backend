-- CreateEnum
CREATE TYPE "studentType" AS ENUM ('new', 'old');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mockTestScore" INTEGER,
ADD COLUMN     "purpose" TEXT,
ADD COLUMN     "studentType" "studentType";

-- CreateTable
CREATE TABLE "LicenseProcess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentVerification" BOOLEAN NOT NULL DEFAULT false,
    "llApplication" BOOLEAN NOT NULL DEFAULT false,
    "llTestBooking" BOOLEAN NOT NULL DEFAULT false,
    "llTestDay" BOOLEAN NOT NULL DEFAULT false,
    "dlApplication" BOOLEAN NOT NULL DEFAULT false,
    "dlTestBooking" BOOLEAN NOT NULL DEFAULT false,
    "dlTestDay" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicenseProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLAppn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT,
    "applicationNumber" TEXT,
    "dateOfBirth" TEXT,
    "testDate" TEXT,
    "testTime" TEXT,
    "testResult" TEXT,
    "llPdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LLAppn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DLAppn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationNumber" TEXT,
    "llnumber" TEXT,
    "dateOfBirth" TEXT,
    "testDate" TEXT,
    "testTime" TEXT,
    "testResult" TEXT,
    "dlPdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DLAppn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LicenseProcess_userId_key" ON "LicenseProcess"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LLAppn_userId_key" ON "LLAppn"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DLAppn_userId_key" ON "DLAppn"("userId");

-- AddForeignKey
ALTER TABLE "LicenseProcess" ADD CONSTRAINT "LicenseProcess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LLAppn" ADD CONSTRAINT "LLAppn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DLAppn" ADD CONSTRAINT "DLAppn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
