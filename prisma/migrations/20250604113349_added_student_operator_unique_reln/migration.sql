-- CreateTable
CREATE TABLE "OperatorAssistanceLog" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assistedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorAssistanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperatorAssistanceLog_operatorId_studentId_key" ON "OperatorAssistanceLog"("operatorId", "studentId");

-- AddForeignKey
ALTER TABLE "OperatorAssistanceLog" ADD CONSTRAINT "OperatorAssistanceLog_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorAssistanceLog" ADD CONSTRAINT "OperatorAssistanceLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
