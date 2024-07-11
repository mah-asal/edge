/*
  Warnings:

  - You are about to drop the column `action` on the `RequestLog` table. All the data in the column will be lost.
  - Added the required column `method` to the `RequestLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `RequestLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RequestLog" DROP COLUMN "action",
ADD COLUMN     "method" TEXT NOT NULL,
ADD COLUMN     "path" TEXT NOT NULL;
