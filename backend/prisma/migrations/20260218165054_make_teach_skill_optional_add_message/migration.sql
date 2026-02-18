-- DropForeignKey
ALTER TABLE `swaprequest` DROP FOREIGN KEY `SwapRequest_teachSkillId_fkey`;

-- DropIndex
DROP INDEX `SwapRequest_teachSkillId_fkey` ON `swaprequest`;

-- AlterTable
ALTER TABLE `swaprequest` ADD COLUMN `message` TEXT NULL,
    MODIFY `teachSkillId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `SwapRequest` ADD CONSTRAINT `SwapRequest_teachSkillId_fkey` FOREIGN KEY (`teachSkillId`) REFERENCES `UserSkill`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
