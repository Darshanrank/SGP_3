/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `Users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `adminpenalty` DROP FOREIGN KEY `AdminPenalty_userId_fkey`;

-- DropForeignKey
ALTER TABLE `blockeduser` DROP FOREIGN KEY `BlockedUser_blockedUserId_fkey`;

-- DropForeignKey
ALTER TABLE `blockeduser` DROP FOREIGN KEY `BlockedUser_blockerId_fkey`;

-- DropForeignKey
ALTER TABLE `calendarevent` DROP FOREIGN KEY `CalendarEvent_swapClassId_fkey`;

-- DropForeignKey
ALTER TABLE `calendarevent` DROP FOREIGN KEY `CalendarEvent_userId_fkey`;

-- DropForeignKey
ALTER TABLE `calendarreminderlog` DROP FOREIGN KEY `CalendarReminderLog_calendarEventId_fkey`;

-- DropForeignKey
ALTER TABLE `calendarreminderlog` DROP FOREIGN KEY `CalendarReminderLog_userId_fkey`;

-- DropForeignKey
ALTER TABLE `chatmessage` DROP FOREIGN KEY `ChatMessage_chatRoomId_fkey`;

-- DropForeignKey
ALTER TABLE `chatmessage` DROP FOREIGN KEY `ChatMessage_senderId_fkey`;

-- DropForeignKey
ALTER TABLE `chatroom` DROP FOREIGN KEY `ChatRoom_swapClassId_fkey`;

-- DropForeignKey
ALTER TABLE `classroomfile` DROP FOREIGN KEY `ClassroomFile_swapClassId_fkey`;

-- DropForeignKey
ALTER TABLE `classroomfile` DROP FOREIGN KEY `ClassroomFile_uploadedBy_fkey`;

-- DropForeignKey
ALTER TABLE `classtodo` DROP FOREIGN KEY `ClassTodo_swapClassId_fkey`;

-- DropForeignKey
ALTER TABLE `codesnippet` DROP FOREIGN KEY `CodeSnippet_createdBy_fkey`;

-- DropForeignKey
ALTER TABLE `codesnippet` DROP FOREIGN KEY `CodeSnippet_swapClassId_fkey`;

-- DropForeignKey
ALTER TABLE `learninggoal` DROP FOREIGN KEY `LearningGoal_userId_fkey`;

-- DropForeignKey
ALTER TABLE `notification` DROP FOREIGN KEY `Notification_userId_fkey`;

-- DropForeignKey
ALTER TABLE `notificationpreference` DROP FOREIGN KEY `NotificationPreference_userId_fkey`;

-- DropForeignKey
ALTER TABLE `pinnedresource` DROP FOREIGN KEY `PinnedResource_createdBy_fkey`;

-- DropForeignKey
ALTER TABLE `pinnedresource` DROP FOREIGN KEY `PinnedResource_swapClassId_fkey`;

-- DropForeignKey
ALTER TABLE `profileprivacy` DROP FOREIGN KEY `ProfilePrivacy_userId_fkey`;

-- DropForeignKey
ALTER TABLE `profileview` DROP FOREIGN KEY `ProfileView_userId_fkey`;

-- DropForeignKey
ALTER TABLE `profileview` DROP FOREIGN KEY `ProfileView_viewerId_fkey`;

-- DropForeignKey
ALTER TABLE `pushsubscription` DROP FOREIGN KEY `PushSubscription_userId_fkey`;

-- DropForeignKey
ALTER TABLE `refreshtoken` DROP FOREIGN KEY `RefreshToken_userId_fkey`;

-- DropForeignKey
ALTER TABLE `report` DROP FOREIGN KEY `Report_reportedUserId_fkey`;

-- DropForeignKey
ALTER TABLE `report` DROP FOREIGN KEY `Report_reporterId_fkey`;

-- DropForeignKey
ALTER TABLE `reviewhelpfulvote` DROP FOREIGN KEY `ReviewHelpfulVote_reviewId_fkey`;

-- DropForeignKey
ALTER TABLE `reviewhelpfulvote` DROP FOREIGN KEY `ReviewHelpfulVote_userId_fkey`;

-- DropForeignKey
ALTER TABLE `savedfilter` DROP FOREIGN KEY `SavedFilter_userId_fkey`;

-- DropForeignKey
ALTER TABLE `sharednote` DROP FOREIGN KEY `SharedNote_swapClassId_fkey`;

-- DropForeignKey
ALTER TABLE `skillpreview` DROP FOREIGN KEY `SkillPreview_userSkillId_fkey`;

-- DropForeignKey
ALTER TABLE `swapclass` DROP FOREIGN KEY `SwapClass_swapRequestId_fkey`;

-- DropForeignKey
ALTER TABLE `swapcompletion` DROP FOREIGN KEY `SwapCompletion_swapClassId_fkey`;

-- DropForeignKey
ALTER TABLE `swaprequest` DROP FOREIGN KEY `SwapRequest_fromUserId_fkey`;

-- DropForeignKey
ALTER TABLE `swaprequest` DROP FOREIGN KEY `SwapRequest_toUserId_fkey`;

-- DropForeignKey
ALTER TABLE `swapreview` DROP FOREIGN KEY `SwapReview_revieweeId_fkey`;

-- DropForeignKey
ALTER TABLE `swapreview` DROP FOREIGN KEY `SwapReview_reviewerId_fkey`;

-- DropForeignKey
ALTER TABLE `swapreview` DROP FOREIGN KEY `SwapReview_swapClassId_fkey`;

-- DropForeignKey
ALTER TABLE `useravailability` DROP FOREIGN KEY `UserAvailability_userId_fkey`;

-- DropForeignKey
ALTER TABLE `userbadge` DROP FOREIGN KEY `UserBadge_userId_fkey`;

-- DropForeignKey
ALTER TABLE `userprofile` DROP FOREIGN KEY `UserProfile_userId_fkey`;

-- DropForeignKey
ALTER TABLE `userreward` DROP FOREIGN KEY `UserReward_userId_fkey`;

-- DropForeignKey
ALTER TABLE `userskill` DROP FOREIGN KEY `UserSkill_userId_fkey`;

-- DropIndex
DROP INDEX `CalendarEvent_swapClassId_fkey` ON `calendarevent`;

-- DropIndex
DROP INDEX `ClassTodo_swapClassId_fkey` ON `classtodo`;

-- DropIndex
DROP INDEX `Report_reportedUserId_fkey` ON `report`;

-- DropIndex
DROP INDEX `Report_reporterId_fkey` ON `report`;

-- DropIndex
DROP INDEX `SwapReview_reviewerId_fkey` ON `swapreview`;

-- DropIndex
DROP INDEX `UserBadge_userId_fkey` ON `userbadge`;

-- AlterTable
ALTER TABLE `calendarevent` ADD COLUMN `type` ENUM('teaching', 'learning', 'swap', 'personal') NOT NULL DEFAULT 'personal';

-- CreateIndex
CREATE INDEX `Notification_userId_idx` ON `Notification`(`userId`);

-- CreateIndex
CREATE UNIQUE INDEX `Users_username_key` ON `Users`(`username`);

-- AddForeignKey
ALTER TABLE `UserProfile` ADD CONSTRAINT `UserProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LearningGoal` ADD CONSTRAINT `LearningGoal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfilePrivacy` ADD CONSTRAINT `ProfilePrivacy_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileView` ADD CONSTRAINT `ProfileView_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileView` ADD CONSTRAINT `ProfileView_viewerId_fkey` FOREIGN KEY (`viewerId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserAvailability` ADD CONSTRAINT `UserAvailability_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SavedFilter` ADD CONSTRAINT `SavedFilter_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSkill` ADD CONSTRAINT `UserSkill_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SkillPreview` ADD CONSTRAINT `SkillPreview_userSkillId_fkey` FOREIGN KEY (`userSkillId`) REFERENCES `UserSkill`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwapRequest` ADD CONSTRAINT `SwapRequest_fromUserId_fkey` FOREIGN KEY (`fromUserId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwapRequest` ADD CONSTRAINT `SwapRequest_toUserId_fkey` FOREIGN KEY (`toUserId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwapClass` ADD CONSTRAINT `SwapClass_swapRequestId_fkey` FOREIGN KEY (`swapRequestId`) REFERENCES `SwapRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassTodo` ADD CONSTRAINT `ClassTodo_swapClassId_fkey` FOREIGN KEY (`swapClassId`) REFERENCES `SwapClass`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PinnedResource` ADD CONSTRAINT `PinnedResource_swapClassId_fkey` FOREIGN KEY (`swapClassId`) REFERENCES `SwapClass`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PinnedResource` ADD CONSTRAINT `PinnedResource_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CodeSnippet` ADD CONSTRAINT `CodeSnippet_swapClassId_fkey` FOREIGN KEY (`swapClassId`) REFERENCES `SwapClass`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CodeSnippet` ADD CONSTRAINT `CodeSnippet_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassroomFile` ADD CONSTRAINT `ClassroomFile_swapClassId_fkey` FOREIGN KEY (`swapClassId`) REFERENCES `SwapClass`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassroomFile` ADD CONSTRAINT `ClassroomFile_uploadedBy_fkey` FOREIGN KEY (`uploadedBy`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SharedNote` ADD CONSTRAINT `SharedNote_swapClassId_fkey` FOREIGN KEY (`swapClassId`) REFERENCES `SwapClass`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatRoom` ADD CONSTRAINT `ChatRoom_swapClassId_fkey` FOREIGN KEY (`swapClassId`) REFERENCES `SwapClass`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_chatRoomId_fkey` FOREIGN KEY (`chatRoomId`) REFERENCES `ChatRoom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwapCompletion` ADD CONSTRAINT `SwapCompletion_swapClassId_fkey` FOREIGN KEY (`swapClassId`) REFERENCES `SwapClass`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwapReview` ADD CONSTRAINT `SwapReview_swapClassId_fkey` FOREIGN KEY (`swapClassId`) REFERENCES `SwapClass`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwapReview` ADD CONSTRAINT `SwapReview_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwapReview` ADD CONSTRAINT `SwapReview_revieweeId_fkey` FOREIGN KEY (`revieweeId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewHelpfulVote` ADD CONSTRAINT `ReviewHelpfulVote_reviewId_fkey` FOREIGN KEY (`reviewId`) REFERENCES `SwapReview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewHelpfulVote` ADD CONSTRAINT `ReviewHelpfulVote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserReward` ADD CONSTRAINT `UserReward_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserBadge` ADD CONSTRAINT `UserBadge_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationPreference` ADD CONSTRAINT `NotificationPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PushSubscription` ADD CONSTRAINT `PushSubscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarReminderLog` ADD CONSTRAINT `CalendarReminderLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarReminderLog` ADD CONSTRAINT `CalendarReminderLog_calendarEventId_fkey` FOREIGN KEY (`calendarEventId`) REFERENCES `CalendarEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarEvent` ADD CONSTRAINT `CalendarEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarEvent` ADD CONSTRAINT `CalendarEvent_swapClassId_fkey` FOREIGN KEY (`swapClassId`) REFERENCES `SwapClass`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_reportedUserId_fkey` FOREIGN KEY (`reportedUserId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlockedUser` ADD CONSTRAINT `BlockedUser_blockerId_fkey` FOREIGN KEY (`blockerId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlockedUser` ADD CONSTRAINT `BlockedUser_blockedUserId_fkey` FOREIGN KEY (`blockedUserId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminPenalty` ADD CONSTRAINT `AdminPenalty_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefreshToken` ADD CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `adminpenalty` RENAME INDEX `AdminPenalty_userId_fkey` TO `AdminPenalty_userId_idx`;

-- RenameIndex
ALTER TABLE `calendarevent` RENAME INDEX `CalendarEvent_userId_fkey` TO `CalendarEvent_userId_idx`;

-- RenameIndex
ALTER TABLE `chatmessage` RENAME INDEX `ChatMessage_chatRoomId_fkey` TO `ChatMessage_chatRoomId_idx`;

-- RenameIndex
ALTER TABLE `chatmessage` RENAME INDEX `ChatMessage_senderId_fkey` TO `ChatMessage_senderId_idx`;

-- RenameIndex
ALTER TABLE `swaprequest` RENAME INDEX `SwapRequest_fromUserId_fkey` TO `SwapRequest_fromUserId_idx`;

-- RenameIndex
ALTER TABLE `swaprequest` RENAME INDEX `SwapRequest_toUserId_fkey` TO `SwapRequest_toUserId_idx`;

-- RenameIndex
ALTER TABLE `useravailability` RENAME INDEX `UserAvailability_userId_fkey` TO `UserAvailability_userId_idx`;

-- RenameIndex
ALTER TABLE `userskill` RENAME INDEX `UserSkill_skillId_fkey` TO `UserSkill_skillId_idx`;
