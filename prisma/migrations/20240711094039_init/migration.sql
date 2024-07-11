-- CreateTable
CREATE TABLE "PaymentLog" (
    "id" SERIAL NOT NULL,
    "user" TEXT NOT NULL,
    "factor" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "payied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestLog" (
    "id" SERIAL NOT NULL,
    "connection" TEXT NOT NULL DEFAULT 'http',
    "user" TEXT,
    "action" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "response" JSONB NOT NULL,
    "code" INTEGER NOT NULL DEFAULT 200,
    "cache" BOOLEAN NOT NULL DEFAULT false,
    "requestedAt" INTEGER NOT NULL,
    "responsedAt" INTEGER NOT NULL,
    "tookedFor" INTEGER NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestLog_pkey" PRIMARY KEY ("id")
);
