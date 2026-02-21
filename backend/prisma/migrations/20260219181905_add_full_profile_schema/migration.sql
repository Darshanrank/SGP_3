-- AlterTable
ALTER TABLE `userprofile` ADD COLUMN `fullName` VARCHAR(191) NULL,
    ADD COLUMN `githubLink` VARCHAR(191) NULL,
    ADD COLUMN `linkedinLink` VARCHAR(191) NULL,
    ADD COLUMN `portfolioLink` VARCHAR(191) NULL,
    ADD COLUMN `youtubeLink` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `UserAvailability` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `dayOfWeek` VARCHAR(191) NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `timezone` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserAvailability` ADD CONSTRAINT `UserAvailability_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
