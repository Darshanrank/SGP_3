-- AlterTable
ALTER TABLE `SwapReview`
    ADD COLUMN `clarityRating` INTEGER NULL,
    ADD COLUMN `punctualityRating` INTEGER NULL,
    ADD COLUMN `communicationRating` INTEGER NULL,
    ADD COLUMN `expertiseRating` INTEGER NULL,
    ADD COLUMN `overallRating` INTEGER NULL,
    ADD COLUMN `helpfulVotes` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `verifiedSwap` BOOLEAN NOT NULL DEFAULT true;

-- Backfill structured ratings from legacy single rating
UPDATE `SwapReview`
SET
    `clarityRating` = `rating`,
    `punctualityRating` = `rating`,
    `communicationRating` = `rating`,
    `expertiseRating` = `rating`,
    `overallRating` = `rating`
WHERE `overallRating` IS NULL;

-- Make structured fields required now that data is backfilled
ALTER TABLE `SwapReview`
    MODIFY `clarityRating` INTEGER NOT NULL,
    MODIFY `punctualityRating` INTEGER NOT NULL,
    MODIFY `communicationRating` INTEGER NOT NULL,
    MODIFY `expertiseRating` INTEGER NOT NULL,
    MODIFY `overallRating` INTEGER NOT NULL;

-- Drop legacy column
ALTER TABLE `SwapReview`
    DROP COLUMN `rating`;

-- CreateIndex
CREATE INDEX `SwapReview_revieweeId_helpfulVotes_idx` ON `SwapReview`(`revieweeId`, `helpfulVotes`);

-- CreateIndex
CREATE INDEX `SwapReview_overallRating_idx` ON `SwapReview`(`overallRating`);

-- CreateTable
CREATE TABLE `ReviewHelpfulVote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reviewId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ReviewHelpfulVote_reviewId_userId_key`(`reviewId`, `userId`),
    INDEX `ReviewHelpfulVote_reviewId_idx`(`reviewId`),
    INDEX `ReviewHelpfulVote_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ReviewHelpfulVote` ADD CONSTRAINT `ReviewHelpfulVote_reviewId_fkey` FOREIGN KEY (`reviewId`) REFERENCES `SwapReview`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewHelpfulVote` ADD CONSTRAINT `ReviewHelpfulVote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;
