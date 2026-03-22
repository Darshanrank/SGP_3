ALTER TABLE `UserSkill`
ADD COLUMN `displayOrder` INTEGER NOT NULL DEFAULT 0;

CREATE INDEX `UserSkill_userId_displayOrder_idx` ON `UserSkill`(`userId`, `displayOrder`);
