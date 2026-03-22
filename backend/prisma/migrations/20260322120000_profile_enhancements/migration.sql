-- AlterTable
ALTER TABLE `UserProfile`
    ADD COLUMN `teachingStyle` TEXT NULL;

-- CreateTable
CREATE TABLE `LearningGoal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `goalText` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LearningGoal_userId_idx`(`userId`),
    INDEX `LearningGoal_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfilePrivacy` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `showAvailability` BOOLEAN NOT NULL DEFAULT true,
    `showPortfolio` BOOLEAN NOT NULL DEFAULT true,
    `showSocialLinks` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProfilePrivacy_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfileView` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `viewerId` INTEGER NOT NULL,
    `viewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProfileView_userId_idx`(`userId`),
    INDEX `ProfileView_viewerId_idx`(`viewerId`),
    INDEX `ProfileView_viewedAt_idx`(`viewedAt`),
    UNIQUE INDEX `ProfileView_userId_viewerId_viewedAt_key`(`userId`, `viewerId`, `viewedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LearningGoal` ADD CONSTRAINT `LearningGoal_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfilePrivacy` ADD CONSTRAINT `ProfilePrivacy_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileView` ADD CONSTRAINT `ProfileView_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileView` ADD CONSTRAINT `ProfileView_viewerId_fkey`
    FOREIGN KEY (`viewerId`) REFERENCES `Users`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
