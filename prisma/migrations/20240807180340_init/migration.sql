/*
  Warnings:

  - You are about to drop the column `type` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `CampaignReciver` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "CampaignReciver" DROP COLUMN "type";
