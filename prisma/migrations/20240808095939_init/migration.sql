/*
  Warnings:

  - You are about to drop the column `action` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `template` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the `CampaignReciver` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `code` to the `Campaign` table without a default value. This is not possible if the table is not empty.
  - Added the required column `message` to the `Campaign` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Campaign` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CampaignReciver" DROP CONSTRAINT "CampaignReciver_campaign_id_fkey";

-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "action",
DROP COLUMN "template",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "opens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sends" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'sending',
ADD COLUMN     "type" TEXT NOT NULL;

-- DropTable
DROP TABLE "CampaignReciver";
