import prisma from '../prisma/client.js';
import { logger } from './logger.js';

/**
 * Badge condition format stored in Badge.condition:
 *   "totalSwaps >= 5"
 *   "totalSwaps >= 10"
 *   "points >= 100"
 *   "totalSwaps >= 1"
 *
 * Evaluates all badge conditions for a user and assigns any newly-earned badges.
 * Returns an array of newly-assigned badge objects.
 */
export const evaluateBadges = async (userId) => {
    const newBadges = [];

    try {
        // Get user stats
        const reward = await prisma.userReward.findUnique({ where: { userId } });
        if (!reward) return newBadges;

        const stats = {
            totalSwaps: reward.totalSwaps,
            points: reward.points,
        };

        // Get all badges and user's existing badges
        const [allBadges, existingBadgeIds] = await Promise.all([
            prisma.badge.findMany(),
            prisma.userBadge.findMany({
                where: { userId },
                select: { badgeId: true },
            }).then((ubs) => new Set(ubs.map((ub) => ub.badgeId))),
        ]);

        for (const badge of allBadges) {
            if (existingBadgeIds.has(badge.id)) continue; // already earned

            const earned = evaluateCondition(badge.condition, stats);
            if (earned) {
                try {
                    const userBadge = await prisma.userBadge.create({
                        data: { userId, badgeId: badge.id },
                    });

                    // Create notification
                    await prisma.notification.create({
                        data: {
                            userId,
                            type: 'SYSTEM',
                            message: `🏆 You earned the "${badge.name}" badge!`,
                        },
                    });

                    newBadges.push({ ...userBadge, badge });
                    logger.info(`Badge "${badge.name}" awarded to user ${userId}`);
                } catch (err) {
                    // Ignore duplicate assignments (race condition)
                    if (err.code !== 'P2002') throw err;
                }
            }
        }
    } catch (err) {
        logger.warn('Badge evaluation failed', { userId, error: err.message });
    }

    return newBadges;
};

/**
 * Parses a simple condition string like "totalSwaps >= 5" or "points >= 100"
 * and evaluates it against the stats object.
 */
function evaluateCondition(condition, stats) {
    if (!condition || typeof condition !== 'string') return false;

    // Support: "field >= value", "field > value", "field == value"
    const match = condition.trim().match(/^(\w+)\s*(>=|>|==|<=|<)\s*(\d+)$/);
    if (!match) return false;

    const [, field, operator, valueStr] = match;
    const statValue = stats[field];
    const threshold = parseInt(valueStr, 10);

    if (statValue === undefined || statValue === null) return false;

    switch (operator) {
        case '>=': return statValue >= threshold;
        case '>':  return statValue > threshold;
        case '==': return statValue === threshold;
        case '<=': return statValue <= threshold;
        case '<':  return statValue < threshold;
        default:   return false;
    }
}
