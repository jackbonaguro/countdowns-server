/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `Countdown` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `expiresAt` to the `Countdown` table without a default value. This is not possible if the table is not empty.
  - Added the required column `metadata` to the `Countdown` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Countdown` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uuid` to the `Countdown` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Countdown" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "metadata" JSONB NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "uuid" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Countdown_uuid_key" ON "Countdown"("uuid");
