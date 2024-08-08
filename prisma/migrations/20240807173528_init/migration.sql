/*
  Warnings:

  - Added the required column `campaign_id` to the `CampaignReciver` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CampaignReciver" ADD COLUMN     "campaign_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "CampaignReciver" ADD CONSTRAINT "CampaignReciver_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
