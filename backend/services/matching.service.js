import prisma from '../prisma/client.js';

/**
 * Smart Skill-Matching Algorithm
 * Finds users where:
 *   - They TEACH a skill I want to LEARN
 *   - (Optionally) I TEACH a skill they want to LEARN  ← mutual match bonus
 * Returns ranked list of potential swap partners.
 */
export const getMatchedUsersService = async (userId, { page = 1, limit = 10 } = {}) => {
    // 1. Get my skills
    const mySkills = await prisma.userSkill.findMany({
        where: { userId },
        select: { skillId: true, type: true }
    });

    const myLearnSkillIds = mySkills.filter(s => s.type === 'LEARN').map(s => s.skillId);
    const myTeachSkillIds = mySkills.filter(s => s.type === 'TEACH').map(s => s.skillId);

    if (myLearnSkillIds.length === 0) {
        return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    // 2. Find users who TEACH what I want to LEARN (primary match)
    const teacherMatches = await prisma.userSkill.findMany({
        where: {
            skillId: { in: myLearnSkillIds },
            type: 'TEACH',
            userId: { not: userId }
        },
        include: {
            user: {
                select: {
                    userId: true,
                    username: true,
                    profile: {
                        select: { fullName: true, avatarUrl: true, bio: true }
                    },
                    reviewsReceived: {
                        select: { rating: true }
                    }
                }
            },
            skill: { select: { id: true, name: true, category: true } }
        }
    });

    // 3. Find users who LEARN what I can TEACH (for mutual-match scoring)
    const learnerMatchUserIds = myTeachSkillIds.length > 0
        ? (await prisma.userSkill.findMany({
            where: {
                skillId: { in: myTeachSkillIds },
                type: 'LEARN',
                userId: { not: userId }
            },
            select: { userId: true, skillId: true }
        }))
        : [];

    const mutualLearnerMap = new Map();
    for (const l of learnerMatchUserIds) {
        if (!mutualLearnerMap.has(l.userId)) mutualLearnerMap.set(l.userId, []);
        mutualLearnerMap.get(l.userId).push(l.skillId);
    }

    // 4. Build unique user map with scoring
    const userMap = new Map();

    for (const match of teacherMatches) {
        const uid = match.user.userId;
        if (!userMap.has(uid)) {
            // Avg rating
            const ratings = match.user.reviewsReceived || [];
            const avgRating = ratings.length > 0
                ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
                : 0;

            userMap.set(uid, {
                userId: uid,
                username: match.user.username,
                fullName: match.user.profile?.fullName || null,
                avatarUrl: match.user.profile?.avatarUrl || null,
                bio: match.user.profile?.bio || null,
                avgRating: Math.round(avgRating * 10) / 10,
                reviewCount: ratings.length,
                matchingTeachSkills: [],  // They teach, I learn
                mutualLearnSkills: [],    // They learn, I teach
                score: 0
            });
        }

        const entry = userMap.get(uid);
        entry.matchingTeachSkills.push({
            skillId: match.skill.id,
            skillName: match.skill.name,
            category: match.skill.category
        });
    }

    // 5. Batch-fetch ALL mutual skill names in one query (avoids N+1)
    const allMutualSkillIds = new Set();
    for (const [uid] of userMap) {
        const ids = mutualLearnerMap.get(uid) || [];
        ids.forEach(id => allMutualSkillIds.add(id));
    }

    const mutualSkillLookup = new Map();
    if (allMutualSkillIds.size > 0) {
        const skills = await prisma.skill.findMany({
            where: { id: { in: [...allMutualSkillIds] } },
            select: { id: true, name: true, category: true }
        });
        for (const s of skills) {
            mutualSkillLookup.set(s.id, s);
        }
    }

    // Attach mutual-match data & score
    for (const [uid, entry] of userMap) {
        const mutualSkillIds = mutualLearnerMap.get(uid) || [];
        entry.mutualLearnSkills = mutualSkillIds
            .map(id => mutualSkillLookup.get(id))
            .filter(Boolean)
            .map(s => ({ skillId: s.id, skillName: s.name, category: s.category }));

        // Scoring: primary matches + mutual bonus + rating bonus
        entry.score =
            entry.matchingTeachSkills.length * 10 +   // each matching skill = 10 pts
            entry.mutualLearnSkills.length * 15 +      // mutual match = 15 pts (higher)
            entry.avgRating * 2;                       // rating bonus
    }

    // 6. Sort by score desc, then paginate
    const sorted = [...userMap.values()].sort((a, b) => b.score - a.score);
    const total = sorted.length;
    const start = (page - 1) * limit;
    const paginated = sorted.slice(start, start + limit);

    return {
        data: paginated,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};
