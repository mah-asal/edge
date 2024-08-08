-- CreateIndex
CREATE INDEX "FeedbackScore_user_idx" ON "FeedbackScore"("user");

-- CreateIndex
CREATE INDEX "File_user_hash_idx" ON "File"("user", "hash");

-- CreateIndex
CREATE INDEX "Notification_user_idx" ON "Notification"("user");

-- CreateIndex
CREATE INDEX "NotificationSend_user_idx" ON "NotificationSend"("user");

-- CreateIndex
CREATE INDEX "PaymentLog_user_idx" ON "PaymentLog"("user");
