-- CreateTable
CREATE TABLE "Campaign" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
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

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);
