-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "user" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);
