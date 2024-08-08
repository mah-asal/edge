/*
  Warnings:

  - You are about to drop the column `data` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `done` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `doneAt` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `ip` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `unique` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `user` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `userkey` on the `Campaign` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "data",
DROP COLUMN "done",
DROP COLUMN "doneAt",
DROP COLUMN "ip",
DROP COLUMN "message",
DROP COLUMN "unique",
DROP COLUMN "user",
DROP COLUMN "userkey";

-- CreateTable
CREATE TABLE "CampaignReciver" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL,
    "doneAt" TIMESTAMP(3),
    "data" JSONB NOT NULL,
    "template" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "unique" TEXT NOT NULL,
    "campainKey" TEXT NOT NULL,
    "userkey" TEXT NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignReciver_pkey" PRIMARY KEY ("id")
);
