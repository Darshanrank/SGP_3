-- Extend ChatMessage for modern chat capabilities.
ALTER TABLE `ChatMessage`
ADD COLUMN `messageType` ENUM('TEXT', 'IMAGE', 'FILE') NOT NULL DEFAULT 'TEXT',
ADD COLUMN `attachmentUrl` VARCHAR(191) NULL,
ADD COLUMN `attachmentName` VARCHAR(191) NULL,
ADD COLUMN `attachmentMime` VARCHAR(191) NULL,
ADD COLUMN `attachmentSize` INTEGER NULL,
ADD COLUMN `deliveredAt` DATETIME(3) NULL,
ADD COLUMN `readAt` DATETIME(3) NULL;

CREATE INDEX `ChatMessage_createdAt_idx` ON `ChatMessage`(`createdAt`);
CREATE INDEX `ChatMessage_isRead_idx` ON `ChatMessage`(`isRead`);
