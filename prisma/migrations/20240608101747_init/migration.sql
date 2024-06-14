/*
  Warnings:

  - Made the column `uuid` on table `Device` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Device" ALTER COLUMN "uuid" SET NOT NULL,
ALTER COLUMN "timestamp" SET DATA TYPE BIGINT;
