-- AlterTable
ALTER TABLE `Notification`
    MODIFY `type` ENUM('SWAP_REQUEST', 'ACCEPTED', 'CLASS_REMINDER', 'CHAT_MESSAGE', 'PARTNER_TYPING', 'PARTNER_ONLINE', 'SYSTEM', 'ADMIN') NOT NULL,
    ADD COLUMN `link` VARCHAR(191) NULL,
    ADD COLUMN `metadata` TEXT NULL;

-- CreateIndex
CREATE INDEX `Notification_userId_type_idx` ON `Notification`(`userId`, `type`);

-- CreateIndex
CREATE INDEX `Notification_createdAt_idx` ON `Notification`(`createdAt`);

-- CreateTable
CREATE TABLE `NotificationPreference` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `swapRequests` BOOLEAN NOT NULL DEFAULT true,
    `classReminders` BOOLEAN NOT NULL DEFAULT true,
    `chatMessages` BOOLEAN NOT NULL DEFAULT true,
    `partnerStatus` BOOLEAN NOT NULL DEFAULT true,
    `systemAlerts` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NotificationPreference_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PushSubscription` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `endpoint` TEXT NOT NULL,
    `endpointHash` VARCHAR(191) NOT NULL,
    `p256dh` VARCHAR(191) NOT NULL,
    `auth` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PushSubscription_endpointHash_key`(`endpointHash`),
    INDEX `PushSubscription_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CalendarReminderLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `calendarEventId` INTEGER NOT NULL,
    `minutesBefore` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CalendarReminderLog_userId_calendarEventId_minutesBefore_key`(`userId`, `calendarEventId`, `minutesBefore`),
    INDEX `CalendarReminderLog_calendarEventId_idx`(`calendarEventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `NotificationPreference` ADD CONSTRAINT `NotificationPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PushSubscription` ADD CONSTRAINT `PushSubscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarReminderLog` ADD CONSTRAINT `CalendarReminderLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarReminderLog` ADD CONSTRAINT `CalendarReminderLog_calendarEventId_fkey` FOREIGN KEY (`calendarEventId`) REFERENCES `CalendarEvent`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
