-- CreateTable
CREATE TABLE `SwapReview` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `swapClassId` INTEGER NOT NULL,
    `reviewerId` INTEGER NOT NULL,
    `revieweeId` INTEGER NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SwapReview_swapClassId_reviewerId_key`(`swapClassId`, `reviewerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SwapReview` ADD CONSTRAINT `SwapReview_swapClassId_fkey` FOREIGN KEY (`swapClassId`) REFERENCES `SwapClass`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwapReview` ADD CONSTRAINT `SwapReview_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `Users`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwapReview` ADD CONSTRAINT `SwapReview_revieweeId_fkey` FOREIGN KEY (`revieweeId`) REFERENCES `Users`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
