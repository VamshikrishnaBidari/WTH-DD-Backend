-- CreateTable
CREATE TABLE "CourseCombo" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseCombo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseSyllabus" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicenseSyllabus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseSyllabusCombo" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicenseSyllabusCombo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CourseCombo" ADD CONSTRAINT "CourseCombo_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "DrivingSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseSyllabus" ADD CONSTRAINT "LicenseSyllabus_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "DrivingSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseSyllabusCombo" ADD CONSTRAINT "LicenseSyllabusCombo_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "DrivingSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
