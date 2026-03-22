import prisma from '../prisma/client.js';

export const getCommunityStatsService = async () => {
    const [learners, swaps, skills] = await Promise.all([
        prisma.users.count(),
        prisma.swapRequest.count(),
        prisma.skill.count()
    ]);

    return { learners, swaps, skills };
};
