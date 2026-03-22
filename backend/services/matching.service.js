import prisma from '../prisma/client.js';
import { NotFound, ValidationError } from '../errors/generic.errors.js';

const DAY_ALIAS_MAP = {
    MON: 'MONDAY',
    MONDAY: 'MONDAY',
    TUE: 'TUESDAY',
    TUESDAY: 'TUESDAY',
    WED: 'WEDNESDAY',
    WEDNESDAY: 'WEDNESDAY',
    THU: 'THURSDAY',
    THURSDAY: 'THURSDAY',
    FRI: 'FRIDAY',
    FRIDAY: 'FRIDAY',
    SAT: 'SATURDAY',
    SATURDAY: 'SATURDAY',
    SUN: 'SUNDAY',
    SUNDAY: 'SUNDAY'
};

const toPositiveInt = (value, fallback, max = 100) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
    return Math.min(parsed, max);
};

const normalizeDaysInput = (days) => {
    if (!days) return [];

    const rawValues = Array.isArray(days)
        ? days
        : String(days)
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);

    const normalized = rawValues
        .map((item) => DAY_ALIAS_MAP[String(item).trim().toUpperCase()])
        .filter(Boolean);

    return [...new Set(normalized)];
};

const computeAverageRating = (reviews = []) => {
    if (!reviews.length) return 0;
    const total = reviews.reduce((sum, review) => sum + Number(review.overallRating || 0), 0);
    return Math.round((total / reviews.length) * 10) / 10;
};

const uniqueSkills = (skills = [], type) => {
    const seen = new Set();
    const result = [];

    for (const userSkill of skills) {
        if (userSkill.type !== type || !userSkill.skill) continue;
        if (seen.has(userSkill.skillId)) continue;

        seen.add(userSkill.skillId);
        result.push({
            userSkillId: userSkill.id,
            skillId: userSkill.skillId,
            name: userSkill.skill.name,
            category: userSkill.skill.category,
            level: userSkill.level
        });
    }

    return result;
};

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
                    availability: {
                        select: { dayOfWeek: true }
                    },
                    reviewsReceived: {
                        select: { overallRating: true }
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
                ? ratings.reduce((sum, r) => sum + r.overallRating, 0) / ratings.length
                : 0;

            userMap.set(uid, {
                userId: uid,
                username: match.user.username,
                fullName: match.user.profile?.fullName || null,
                avatarUrl: match.user.profile?.avatarUrl || null,
                bio: match.user.profile?.bio || null,
                avgRating: Math.round(avgRating * 10) / 10,
                reviewCount: ratings.length,
                availability: normalizeDaysInput((match.user.availability || []).map((slot) => slot.dayOfWeek)),
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

export const discoverUsersService = async (currentUserId, query = {}) => {
    const page = toPositiveInt(query.page, 1);
    const limit = toPositiveInt(query.limit, 12, 50);
    const skill = String(query.skill || '').trim();
    const language = String(query.language || '').trim();
    const level = ['LOW', 'MEDIUM', 'HIGH'].includes(String(query.level || '').toUpperCase())
        ? String(query.level).toUpperCase()
        : undefined;

    const sortInput = String(query.sort || '').trim().toLowerCase();
    const sortMap = {
        'best-match': 'best-match',
        'highest-rated': 'highest-rated',
        'most-swaps': 'most-swaps',
        newest: 'newest',
        rating: 'highest-rated',
        swaps: 'most-swaps',
        availability: 'best-match'
    };
    const sort = sortMap[sortInput] || 'best-match';

    const minRatingRaw = query.rating ?? query.minRating;
    const minRating = Number.isFinite(Number(minRatingRaw)) ? Number(minRatingRaw) : 0;
    const availabilityDays = normalizeDaysInput(query.availableDays ?? query.days);

    if (minRating < 0 || minRating > 5) {
        throw new ValidationError('Rating filter must be between 0 and 5');
    }

    const [blockedByMe, blockedMe] = await Promise.all([
        prisma.blockedUser.findMany({
            where: { blockerId: currentUserId },
            select: { blockedUserId: true }
        }),
        prisma.blockedUser.findMany({
            where: { blockedUserId: currentUserId },
            select: { blockerId: true }
        })
    ]);

    const excludedIds = [
        currentUserId,
        ...blockedByMe.map((row) => row.blockedUserId),
        ...blockedMe.map((row) => row.blockerId)
    ];

    const andFilters = [{ userId: { notIn: [...new Set(excludedIds)] } }];

    if (skill || level) {
        andFilters.push({
            userSkills: {
                some: {
                    ...(skill ? { skill: { name: { contains: skill } } } : {}),
                    ...(level ? { level } : {})
                }
            }
        });
    }

    if (language) {
        andFilters.push({
            profile: {
                is: {
                    learningLanguage: { contains: language }
                }
            }
        });
    }

    if (availabilityDays.length > 0) {
        andFilters.push({
            availability: {
                some: {
                    dayOfWeek: { in: availabilityDays }
                }
            }
        });
    }

    if (minRating > 0) {
        const ratedUsers = await prisma.swapReview.groupBy({
            by: ['revieweeId'],
            _avg: { overallRating: true },
            having: {
                overallRating: {
                    _avg: { gte: minRating }
                }
            }
        });

        const ratedUserIds = ratedUsers.map((row) => row.revieweeId);
        if (!ratedUserIds.length) {
            return {
                data: [],
                meta: { total: 0, page, limit, totalPages: 0 }
            };
        }

        andFilters.push({ userId: { in: ratedUserIds } });
    }

    const [users, currentUserAvailability] = await Promise.all([
        prisma.users.findMany({
            where: { AND: andFilters },
            include: {
                profile: {
                    select: {
                        fullName: true,
                        avatarUrl: true,
                        learningLanguage: true
                    }
                },
                userSkills: {
                    include: {
                        skill: {
                            select: {
                                id: true,
                                name: true,
                                category: true
                            }
                        }
                    }
                },
                availability: {
                    select: {
                        dayOfWeek: true
                    }
                },
                reviewsReceived: {
                    select: {
                        overallRating: true
                    }
                },
                sentRequests: {
                    where: { status: 'ACCEPTED' },
                    select: { id: true }
                },
                receivedRequests: {
                    where: { status: 'ACCEPTED' },
                    select: { id: true }
                },
                _count: {
                    select: {
                        sentRequests: true,
                        receivedRequests: true
                    }
                }
            }
        }),
        prisma.userAvailability.findMany({
            where: { userId: currentUserId },
            select: { dayOfWeek: true }
        })
    ]);

    const candidateIds = users.map((u) => u.userId);
    const completedClassCounts = new Map();

    if (candidateIds.length > 0) {
        const completedClasses = await prisma.swapClass.findMany({
            where: {
                status: 'COMPLETED',
                swapRequest: {
                    OR: [
                        { fromUserId: { in: candidateIds } },
                        { toUserId: { in: candidateIds } }
                    ]
                }
            },
            select: {
                swapRequest: {
                    select: {
                        fromUserId: true,
                        toUserId: true
                    }
                }
            }
        });

        for (const item of completedClasses) {
            const fromId = item.swapRequest?.fromUserId;
            const toId = item.swapRequest?.toUserId;

            if (fromId && candidateIds.includes(fromId)) {
                completedClassCounts.set(fromId, (completedClassCounts.get(fromId) || 0) + 1);
            }
            if (toId && candidateIds.includes(toId)) {
                completedClassCounts.set(toId, (completedClassCounts.get(toId) || 0) + 1);
            }
        }
    }

    const referenceDays = availabilityDays.length > 0
        ? availabilityDays
        : normalizeDaysInput(currentUserAvailability.map((row) => row.dayOfWeek));
    const referenceDaySet = new Set(referenceDays);
    const searchSkillLower = skill.toLowerCase();

    const mapped = users.map((user) => {
        const teaches = uniqueSkills(user.userSkills, 'TEACH');
        const learns = uniqueSkills(user.userSkills, 'LEARN');
        const avgRating = computeAverageRating(user.reviewsReceived || []);
        const availability = normalizeDaysInput((user.availability || []).map((item) => item.dayOfWeek));
        const availabilityMatch = availability.filter((day) => referenceDaySet.has(day)).length;

        const primaryTeachSkill = skill
            ? teaches.find((teachSkill) => teachSkill.name.toLowerCase().includes(searchSkillLower)) || teaches[0]
            : teaches[0];

        return {
            userId: user.userId,
            username: user.username,
            fullName: user.profile?.fullName || null,
            avatarUrl: user.profile?.avatarUrl || null,
            learningLanguage: user.profile?.learningLanguage || null,
            createdAt: user.createdAt,
            avgRating,
            reviewCount: user.reviewsReceived?.length || 0,
            teaches,
            learns,
            availability,
            availabilityMatch,
            swapsCompleted: completedClassCounts.get(user.userId) || 0,
            acceptedSwaps: (user.sentRequests?.length || 0) + (user.receivedRequests?.length || 0),
            totalSwaps: (user._count?.sentRequests || 0) + (user._count?.receivedRequests || 0),
            primaryTeachSkillId: primaryTeachSkill?.userSkillId || null
        };
    });

    const sorted = mapped.sort((a, b) => {
        if (sort === 'newest') {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }

        if (sort === 'most-swaps') {
            if (b.swapsCompleted !== a.swapsCompleted) return b.swapsCompleted - a.swapsCompleted;
            if (b.acceptedSwaps !== a.acceptedSwaps) return b.acceptedSwaps - a.acceptedSwaps;
            return b.avgRating - a.avgRating;
        }

        if (sort === 'highest-rated') {
            if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
            if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
            return b.swapsCompleted - a.swapsCompleted;
        }

        // Default: best match (availability + rating + experience)
        if (b.availabilityMatch !== a.availabilityMatch) return b.availabilityMatch - a.availabilityMatch;
        if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
        if (b.swapsCompleted !== a.swapsCompleted) return b.swapsCompleted - a.swapsCompleted;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = sorted.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const data = sorted.slice(start, start + limit);

    return {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages
        }
    };
};

export const getSavedFiltersService = async (userId) => {
    return prisma.savedFilter.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });
};

export const createSavedFilterService = async (userId, payload) => {
    const name = String(payload?.name || '').trim();
    const filters = payload?.filters;

    if (!name || name.length < 2) {
        throw new ValidationError('Filter name must be at least 2 characters long');
    }

    if (name.length > 80) {
        throw new ValidationError('Filter name is too long');
    }

    if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
        throw new ValidationError('Filters payload must be a JSON object');
    }

    return prisma.savedFilter.create({
        data: {
            userId,
            name,
            filters
        }
    });
};

export const deleteSavedFilterService = async (userId, savedFilterId) => {
    const id = Number.parseInt(savedFilterId, 10);
    if (!Number.isInteger(id)) {
        throw new ValidationError('Invalid saved filter id');
    }

    const removed = await prisma.savedFilter.deleteMany({
        where: {
            id,
            userId
        }
    });

    if (removed.count === 0) {
        throw new NotFound('Saved filter not found');
    }

    return { message: 'Saved filter deleted' };
};
