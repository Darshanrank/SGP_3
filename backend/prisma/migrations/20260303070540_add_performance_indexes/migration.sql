-- CreateIndex
CREATE INDEX `CalendarEvent_eventDate_idx` ON `CalendarEvent`(`eventDate`);

-- CreateIndex
CREATE INDEX `Notification_userId_isRead_idx` ON `Notification`(`userId`, `isRead`);

-- CreateIndex
CREATE INDEX `SwapRequest_status_idx` ON `SwapRequest`(`status`);

-- CreateIndex
CREATE INDEX `UserSkill_userId_idx` ON `UserSkill`(`userId`);
