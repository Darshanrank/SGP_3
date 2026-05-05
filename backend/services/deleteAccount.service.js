import prisma from '../prisma/client.js';
import { logger } from '../utils/logger.js';

/**
 * Permanently deletes a user and all associated data.
 * Uses a transaction to ensure atomicity.
 */
export const deleteAccountService = async (userId) => {
    return await prisma.$transaction(async (tx) => {
        // Gather IDs up-front for dependency-safe deletes.
        const userSkillIds = await tx.userSkill.findMany({
            where: { userId },
            select: { id: true }
        }).then((rows) => rows.map((row) => row.id));

        const requestIds = await tx.swapRequest.findMany({
            where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
            select: { id: true }
        }).then((rows) => rows.map((row) => row.id));

        const classIds = requestIds.length
            ? await tx.swapClass.findMany({
                where: { swapRequestId: { in: requestIds } },
                select: { id: true }
            }).then((rows) => rows.map((row) => row.id))
            : [];

        const chatRoomIds = classIds.length
            ? await tx.chatRoom.findMany({
                where: { swapClassId: { in: classIds } },
                select: { id: true }
            }).then((rows) => rows.map((row) => row.id))
            : [];

        const classReviewIds = classIds.length
            ? await tx.swapReview.findMany({
                where: { swapClassId: { in: classIds } },
                select: { id: true }
            }).then((rows) => rows.map((row) => row.id))
            : [];

        const userReviewIds = await tx.swapReview.findMany({
            where: { OR: [{ reviewerId: userId }, { revieweeId: userId }] },
            select: { id: true }
        }).then((rows) => rows.map((row) => row.id));

        const allReviewIds = Array.from(new Set([...classReviewIds, ...userReviewIds]));

        // 1) Delete deepest classroom/review/chat children first.
        if (allReviewIds.length) {
            await tx.reviewHelpfulVote.deleteMany({ where: { reviewId: { in: allReviewIds } } });
        }
        await tx.reviewHelpfulVote.deleteMany({ where: { userId } });

        if (chatRoomIds.length) {
            await tx.chatMessage.deleteMany({ where: { chatRoomId: { in: chatRoomIds } } });
        }
        await tx.chatMessage.deleteMany({ where: { senderId: userId } });

        if (classIds.length) {
            await tx.sharedNote.deleteMany({ where: { swapClassId: { in: classIds } } });
            await tx.pinnedResource.deleteMany({ where: { swapClassId: { in: classIds } } });
            await tx.codeSnippet.deleteMany({ where: { swapClassId: { in: classIds } } });
            await tx.classroomFile.deleteMany({ where: { swapClassId: { in: classIds } } });
            await tx.classTodo.deleteMany({ where: { swapClassId: { in: classIds } } });
            await tx.swapCompletion.deleteMany({ where: { swapClassId: { in: classIds } } });
            await tx.swapReview.deleteMany({ where: { swapClassId: { in: classIds } } });
            await tx.calendarReminderLog.deleteMany({ where: { calendarEvent: { swapClassId: { in: classIds } } } });
            await tx.calendarEvent.deleteMany({ where: { swapClassId: { in: classIds } } });
        }

        // 2) Remove containers/parents for classroom data.
        if (chatRoomIds.length) {
            await tx.chatRoom.deleteMany({ where: { id: { in: chatRoomIds } } });
        }
        if (classIds.length) {
            await tx.swapClass.deleteMany({ where: { id: { in: classIds } } });
        }

        // 3) Remove remaining swap-linked records.
        await tx.swapReview.deleteMany({ where: { OR: [{ reviewerId: userId }, { revieweeId: userId }] } });
        await tx.swapRequest.deleteMany({ where: { OR: [{ fromUserId: userId }, { toUserId: userId }] } });

        // 4) Remove remaining user children.
        if (userSkillIds.length) {
            await tx.skillPreview.deleteMany({ where: { userSkillId: { in: userSkillIds } } });
        }
        await tx.userSkill.deleteMany({ where: { userId } });

        await tx.learningGoal.deleteMany({ where: { userId } });
        await tx.profilePrivacy.deleteMany({ where: { userId } });
        await tx.profileView.deleteMany({ where: { OR: [{ userId }, { viewerId: userId }] } });
        await tx.userAvailability.deleteMany({ where: { userId } });
        await tx.savedFilter.deleteMany({ where: { userId } });

        await tx.notification.deleteMany({ where: { userId } });
        await tx.notificationPreference.deleteMany({ where: { userId } });
        await tx.pushSubscription.deleteMany({ where: { userId } });

        await tx.calendarReminderLog.deleteMany({ where: { userId } });
        await tx.calendarReminderLog.deleteMany({ where: { calendarEvent: { userId } } });
        await tx.calendarEvent.deleteMany({ where: { userId } });

        await tx.userBadge.deleteMany({ where: { userId } });
        await tx.userReward.deleteMany({ where: { userId } });

        await tx.adminPenalty.deleteMany({ where: { userId } });
        await tx.report.deleteMany({ where: { OR: [{ reporterId: userId }, { reportedUserId: userId }] } });
        await tx.blockedUser.deleteMany({ where: { OR: [{ blockerId: userId }, { blockedUserId: userId }] } });

        await tx.refreshToken.deleteMany({ where: { userId } });
        await tx.userProfile.deleteMany({ where: { userId } });

        // 5) Finally delete user record.
        await tx.users.delete({ where: { userId } });

        logger.info(`Account deleted for userId ${userId}`);
        return { message: 'Account and all associated data have been permanently deleted.' };
    });
};
