-- CreateTable
CREATE TABLE "Config" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "store" TEXT NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackScore" (
    "id" SERIAL NOT NULL,
    "user" TEXT NOT NULL,
    "score" TEXT NOT NULL,
    "message" TEXT,
    "store" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackScore_pkey" PRIMARY KEY ("id")
);
