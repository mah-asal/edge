/*
  Warnings:

  - Added the required column `redirect` to the `Campaign` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "redirect" TEXT NOT NULL;
