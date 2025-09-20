-- CreateTable
CREATE TABLE "CanceledSlot" (
    "id" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT,
    "calendarId" TEXT NOT NULL,

    CONSTRAINT "CanceledSlot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CanceledSlot" ADD CONSTRAINT "CanceledSlot_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "Calendar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
