-- CreateEnum
CREATE TYPE "Holiday" AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'None');

-- AlterTable
ALTER TABLE "Calendar" ADD COLUMN     "holidaySlots" TEXT[];

-- AlterTable
ALTER TABLE "DrivingSchool" ADD COLUMN     "Holiday" "Holiday" DEFAULT 'None';

-- AlterTable
ALTER TABLE "Operator" ADD COLUMN     "Holiday" "Holiday" DEFAULT 'None';

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "Holiday" "Holiday" DEFAULT 'None';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "Holiday" "Holiday" DEFAULT 'None';

-- AlterTable
ALTER TABLE "weekCalendarUser" ADD COLUMN     "holidaySlots" TEXT[];
