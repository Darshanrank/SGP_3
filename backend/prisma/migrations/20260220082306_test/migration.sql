/*
  Warnings:

  - A unique constraint covering the columns `[userId,skillId,type]` on the table `UserSkill` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `userprofile` ADD COLUMN `emailRemindersEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `profileCompleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `timezone` VARCHAR(191) NULL,
    ADD COLUMN `upcomingSessions` TEXT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `UserSkill_userId_skillId_type_key` ON `UserSkill`(`userId`, `skillId`, `type`);
