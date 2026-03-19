-- Add missing read-status flag for chat messages.
ALTER TABLE `ChatMessage`
ADD COLUMN `isRead` BOOLEAN NOT NULL DEFAULT false;
