-- CreateTable
CREATE TABLE `PinnedResource` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `swapClassId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PinnedResource_swapClassId_idx`(`swapClassId`),
    INDEX `PinnedResource_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CodeSnippet` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `swapClassId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `language` VARCHAR(191) NOT NULL,
    `code` TEXT NOT NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CodeSnippet_swapClassId_idx`(`swapClassId`),
    INDEX `CodeSnippet_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassroomFile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `swapClassId` INTEGER NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `uploadedBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ClassroomFile_swapClassId_idx`(`swapClassId`),
    INDEX `ClassroomFile_uploadedBy_idx`(`uploadedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SharedNote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `swapClassId` INTEGER NOT NULL,
    `content` LONGTEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SharedNote_swapClassId_key`(`swapClassId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PinnedResource` ADD CONSTRAINT `PinnedResource_swapClassId_fkey` FOREIGN KEY (`swapClassId`) REFERENCES `SwapClass`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PinnedResource` ADD CONSTRAINT `PinnedResource_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `Users`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CodeSnippet` ADD CONSTRAINT `CodeSnippet_swapClassId_fkey` FOREIGN KEY (`swapClassId`) REFERENCES `SwapClass`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CodeSnippet` ADD CONSTRAINT `CodeSnippet_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `Users`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassroomFile` ADD CONSTRAINT `ClassroomFile_swapClassId_fkey` FOREIGN KEY (`swapClassId`) REFERENCES `SwapClass`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassroomFile` ADD CONSTRAINT `ClassroomFile_uploadedBy_fkey` FOREIGN KEY (`uploadedBy`) REFERENCES `Users`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SharedNote` ADD CONSTRAINT `SharedNote_swapClassId_fkey` FOREIGN KEY (`swapClassId`) REFERENCES `SwapClass`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
