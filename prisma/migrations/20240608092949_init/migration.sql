-- CreateTable
CREATE TABLE "Device" (
    "id" SERIAL NOT NULL,
    "user" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "store" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "physical" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "screen" TEXT NOT NULL,
    "package" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "user" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "firebase" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSend" (
    "id" SERIAL NOT NULL,
    "user" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "firebase" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationSend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_firebase_key" ON "Notification"("firebase");
