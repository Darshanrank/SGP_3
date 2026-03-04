import prisma from '../prisma/client.js';
import { logger } from '../utils/logger.js';

/**
 * Permanently deletes a user and all associated data.
 * Uses a transaction to ensure atomicity.
 */
export const deleteAccountService = async (userId) => {
    return await prisma.$transaction(async (tx) => {
        // 1. Delete skill previews (depends on userSkills)
        const userSkillIds = await tx.userSkill.findMany({
            where: { userId },
            select: { id: true },
        }).then((skills) => skills.map((s) => s.id));

        if (userSkillIds.length > 0) {
            await tx.skillPreview.deleteMany({
                where: { userSkillId: { in: userSkillIds } },
            });
        }

        // 2. Delete chat messages
        await tx.chatMessage.deleteMany({ where: { senderId: userId } });

        // 3. Delete swap reviews (given and received)
        await tx.swapReview.deleteMany({
            where: { OR: [{ reviewerId: userId }, { revieweeId: userId }] },
        });

        // 4. Delete notifications
        await tx.notification.deleteMany({ where: { userId } });

        // 5. Delete calendar events
        await tx.calendarEvent.deleteMany({ where: { userId } });

        // 6. Delete availability
        await tx.userAvailability.deleteMany({ where: { userId } });

        // 7. Delete badges
        await tx.userBadge.deleteMany({ where: { userId } });

        // 8. Delete rewards
        await tx.userReward.deleteMany({ where: { userId } });

        // 9. Delete penalties
        await tx.adminPenalty.deleteMany({ where: { userId } });

        // 10. Delete reports (filed and received)
        await tx.report.deleteMany({
            where: { OR: [{ reporterId: userId }, { reportedUserId: userId }] },
        });

        // 11. Delete refresh tokens
        await tx.refreshToken.deleteMany({ where: { userId } });

        // 12. Handle swap classes — clean up todos, completions, chat rooms for classes the user is in
        const userSwapRequests = await tx.swapRequest.findMany({
            where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
            select: { id: true },
        });
        const requestIds = userSwapRequests.map((r) => r.id);

        if (requestIds.length > 0) {
            const classIds = await tx.swapClass.findMany({
                where: { swapRequestId: { in: requestIds } },
                select: { id: true },
            }).then((cs) => cs.map((c) => c.id));

            if (classIds.length > 0) {
                // Delete chat room messages, then rooms
                const chatRoomIds = await tx.chatRoom.findMany({
                    where: { swapClassId: { in: classIds } },
                    select: { id: true },
                }).then((cr) => cr.map((r) => r.id));

                if (chatRoomIds.length > 0) {
                    await tx.chatMessage.deleteMany({
                        where: { chatRoomId: { in: chatRoomIds } },
                    });
                    await tx.chatRoom.deleteMany({
                        where: { id: { in: chatRoomIds } },
                    });
                }

                await tx.classTodo.deleteMany({
                    where: { swapClassId: { in: classIds } },
                });
                await tx.swapCompletion.deleteMany({
                    where: { swapClassId: { in: classIds } },
                });
                await tx.swapReview.deleteMany({
                    where: { swapClassId: { in: classIds } },
                });
                await tx.calendarEvent.deleteMany({
                    where: { swapClassId: { in: classIds } },
                });
                await tx.swapClass.deleteMany({
                    where: { id: { in: classIds } },
                });
            }
        }

        // 13. Delete swap requests (must detach userSkills first)
        // Clear teachSkillId/learnSkillId references before deleting user skills
        await tx.swapRequest.deleteMany({
            where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
        });

        // 14. Delete user skills
        await tx.userSkill.deleteMany({ where: { userId } });

        // 15. Delete profile
        await tx.userProfile.deleteMany({ where: { userId } });

        // 16. Delete user
        await tx.users.delete({ where: { userId } });

        logger.info(`Account deleted for userId ${userId}`);
        return { message: 'Account and all associated data have been permanently deleted.' };
    });
};
