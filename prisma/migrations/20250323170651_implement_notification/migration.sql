-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "countdownId" INTEGER NOT NULL,
    "notifyAt" TIMESTAMP(3) NOT NULL,
    "did_attempt" BOOLEAN NOT NULL DEFAULT false,
    "did_succeed" BOOLEAN NOT NULL DEFAULT false,
    "attemptedAt" TIMESTAMP(3),
    "jobNumber" INTEGER,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_countdownId_fkey" FOREIGN KEY ("countdownId") REFERENCES "Countdown"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
