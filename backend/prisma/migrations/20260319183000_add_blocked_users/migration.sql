-- Create block relationship table for user safety controls.
CREATE TABLE `BlockedUser` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `blockerId` INTEGER NOT NULL,
    `blockedUserId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BlockedUser_blockerId_blockedUserId_key`(`blockerId`, `blockedUserId`),
    INDEX `BlockedUser_blockerId_idx`(`blockerId`),
    INDEX `BlockedUser_blockedUserId_idx`(`blockedUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `BlockedUser` ADD CONSTRAINT `BlockedUser_blockerId_fkey` FOREIGN KEY (`blockerId`) REFERENCES `Users`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `BlockedUser` ADD CONSTRAINT `BlockedUser_blockedUserId_fkey` FOREIGN KEY (`blockedUserId`) REFERENCES `Users`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
