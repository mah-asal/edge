/*
  Warnings:

  - Added the required column `ip` to the `FeedbackScore` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FeedbackScore" ADD COLUMN     "ip" TEXT NOT NULL;
