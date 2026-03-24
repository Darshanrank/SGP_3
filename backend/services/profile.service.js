import { ForbiddenError, NotFound, ValidationError } from '../errors/generic.errors.js';
import { sendEmailService } from './sendEmail.service.js';
import prisma from '../prisma/client.js';
import sanitizeHtml from 'sanitize-html';
import { conf } from '../conf/conf.js';
import { areUsersBlocked } from './block.service.js';

// Allow safe HTML in bio (from TinyMCE) but strip dangerous tags/attributes
const sanitizeBio = (html) => sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'u', 'span']),
    allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        span: ['style'],
        img: ['src', 'alt', 'width', 'height']
    },
    allowedSchemes: ['http', 'https'],
    // Strip all event handlers (onload, onerror, etc.)
    disallowedTagsMode: 'discard'
});

const VALID_WEEK_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const USERNAME_REGEX = /^[a-z0-9_]+$/;
const PROFILE_COMPLETION_TOTAL_FIELDS = 6;
const hasProfileEnhancementModels = Boolean(prisma.learningGoal && prisma.profilePrivacy && prisma.profileView);
const TEACHING_STYLE_OPTIONS = [
    'Hands-on Practice',
    'Project Based Learning',
    'Step-by-Step Explanation',
    'Live Coding Sessions',
    'Concept Based Teaching',
    'Debugging Together',
    'Pair Programming',
    'Code Reviews',
    'Interactive Discussions',
    'Real-world Examples',
    'Visual Diagrams & Whiteboard',
    'Assignments & Exercises'
];

const createDefaultPrivacy = () => ({
    showAvailability: true,
    showPortfolio: true,
    showSocialLinks: true
});

const toValidUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
};

const normalizeGoals = (learningGoals = []) => {
    if (!Array.isArray(learningGoals)) return [];

    const seen = new Set();
    const goals = [];

    learningGoals.forEach((goal) => {
        const text = String(goal || '').trim();
        if (!text) return;
        const normalized = text.toLowerCase();
        if (seen.has(normalized)) return;
        seen.add(normalized);
        goals.push(text.slice(0, 200));
    });

    return goals.slice(0, 12);
};

const normalizeTeachingStyles = (teachingStyles = []) => {
    if (!Array.isArray(teachingStyles)) return [];

    const allowed = new Set(TEACHING_STYLE_OPTIONS);
    const seen = new Set();
    const styles = [];

    teachingStyles.forEach((style) => {
        const text = String(style || '').trim();
        if (!allowed.has(text) || seen.has(text)) return;
        seen.add(text);
        styles.push(text);
    });

    return styles;
};

const parseTeachingStyles = (rawValue) => {
    if (Array.isArray(rawValue)) {
        return normalizeTeachingStyles(rawValue);
    }

    if (typeof rawValue !== 'string') {
        return [];
    }

    const value = rawValue.trim();
    if (!value) {
        return [];
    }

    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
            return normalizeTeachingStyles(parsed);
        }
    } catch (_) {
        return normalizeTeachingStyles(value.split(',').map((item) => item.trim()));
    }

    return [];
};

const normalizePrivacy = (privacy) => ({
    showAvailability: typeof privacy?.showAvailability === 'boolean' ? privacy.showAvailability : true,
    showPortfolio: typeof privacy?.showPortfolio === 'boolean' ? privacy.showPortfolio : true,
    showSocialLinks: typeof privacy?.showSocialLinks === 'boolean' ? privacy.showSocialLinks : true
});

const buildProfileCompletion = ({ profile, teachSkills, learnSkills, availability }) => {
    const socialLinks = [
        profile?.githubLink,
        profile?.linkedinLink,
        profile?.portfolioLink,
        profile?.youtubeLink
    ];

    const completedChecks = [
        Boolean(profile?.avatarUrl),
        Boolean(String(profile?.bio || '').replace(/<[^>]*>/g, '').trim()),
        teachSkills.length > 0,
        learnSkills.length > 0,
        availability.length > 0,
        socialLinks.some((link) => Boolean(String(link || '').trim()))
    ];

    const completedFields = completedChecks.filter(Boolean).length;
    const percentage = Math.round((completedFields / PROFILE_COMPLETION_TOTAL_FIELDS) * 100);

    return {
        completedFields,
        totalFields: PROFILE_COMPLETION_TOTAL_FIELDS,
        percentage,
        suggestion: 'Complete your profile to get better skill swap matches.'
    };
};

const buildAvailabilityPreview = (availability = []) => {
    const dayMap = new Map(VALID_WEEK_DAYS.map((day) => [day, []]));

    availability.forEach((slot) => {
        if (!dayMap.has(slot.dayOfWeek)) return;
        dayMap.get(slot.dayOfWeek).push({
            startTime: slot.startTime,
            endTime: slot.endTime,
            timezone: slot.timezone
        });
    });

    return VALID_WEEK_DAYS.map((day) => ({
        day,
        label: day.slice(0, 3),
        available: dayMap.get(day).length > 0,
        slots: dayMap.get(day)
    }));
};

const computeLearningStreak = (completedDates = []) => {
    if (!completedDates.length) return 0;

    const sorted = completedDates
        .filter(Boolean)
        .map((date) => new Date(date))
        .sort((a, b) => b.getTime() - a.getTime());

    if (!sorted.length) return 0;

    let streak = 1;
    let previous = sorted[0];

    for (let i = 1; i < sorted.length; i += 1) {
        const current = sorted[i];
        const diffInDays = Math.floor((previous.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
        if (diffInDays <= 8) {
            streak += 1;
            previous = current;
            continue;
        }
        break;
    }

    return streak;
};

const normalizeAvailabilitySlots = (availability = []) => {
    if (!Array.isArray(availability)) return [];

    const normalized = [];
    availability.forEach((slot) => {
        const startTime = slot?.startTime;
        const endTime = slot?.endTime;
        const timezone = slot?.timezone;
        const rawDays = Array.isArray(slot?.days)
            ? slot.days
            : Array.isArray(slot?.dayOfWeek)
                ? slot.dayOfWeek
                : slot?.dayOfWeek
                    ? [slot.dayOfWeek]
                    : [];

        if (!startTime || !endTime || !timezone) return;

        rawDays
            .map((day) => String(day).trim().toUpperCase())
            .filter((day) => VALID_WEEK_DAYS.includes(day))
            .forEach((dayOfWeek) => {
                normalized.push({ dayOfWeek, startTime, endTime, timezone });
            });
    });

    const deduplicated = new Map();
    normalized.forEach((slot) => {
        deduplicated.set(`${slot.dayOfWeek}|${slot.startTime}|${slot.endTime}|${slot.timezone}`, slot);
    });

    return Array.from(deduplicated.values());
};

export const getMyProfileService = async (userId) => {
    const user = await prisma.users.findUnique({
        where: { userId },
        include: {
            profile: true,
            availability: true,
            ...(hasProfileEnhancementModels
                ? {
                    learningGoals: {
                        orderBy: { createdAt: 'desc' }
                    },
                    profilePrivacy: true
                }
                : {}),
            userSkills: {
                include: { skill: true, preview: true }
            },
            badges: {
                include: { badge: true }
            },
            rewards: true
        }
    });

    if (!user) {
        throw new NotFound('User not found');
    }

    const teachSkills = user.userSkills.filter((skill) => skill.type === 'TEACH');
    const learnSkills = user.userSkills.filter((skill) => skill.type === 'LEARN');

    const [
        reviewsAggregate,
        completedClasses,
        profileViewsResult,
        swapRequestsReceived,
        matchesFound,
        recentSwaps
    ] = await Promise.all([
        prisma.swapReview.aggregate({
            where: { revieweeId: userId },
            _avg: { overallRating: true },
            _count: { overallRating: true }
        }),
        prisma.swapClass.findMany({
            where: {
                status: 'COMPLETED',
                swapRequest: {
                    OR: [{ fromUserId: userId }, { toUserId: userId }]
                }
            },
            select: {
                id: true,
                endedAt: true,
                completion: {
                    select: { completedAt: true }
                },
                swapRequest: {
                    select: {
                        id: true,
                        fromUserId: true,
                        toUserId: true,
                        fromUser: { select: { userId: true, username: true } },
                        toUser: { select: { userId: true, username: true } },
                        teachSkill: { include: { skill: true } },
                        learnSkill: { include: { skill: true } }
                    }
                }
            },
            orderBy: { id: 'desc' },
            take: 8
        }),
        hasProfileEnhancementModels ? prisma.profileView.count({ where: { userId } }) : Promise.resolve(0),
        prisma.swapRequest.count({ where: { toUserId: userId } }),
        prisma.swapRequest.count({
            where: {
                status: 'ACCEPTED',
                OR: [{ toUserId: userId }, { fromUserId: userId }]
            }
        }),
        prisma.swapClass.findMany({
            where: {
                swapRequest: {
                    OR: [{ fromUserId: userId }, { toUserId: userId }]
                }
            },
            select: {
                id: true,
                status: true,
                startedAt: true,
                endedAt: true,
                swapRequest: {
                    select: {
                        fromUserId: true,
                        toUserId: true,
                        fromUser: { select: { username: true } },
                        toUser: { select: { username: true } },
                        teachSkill: { include: { skill: true } },
                        learnSkill: { include: { skill: true } }
                    }
                }
            },
            orderBy: { id: 'desc' },
            take: 6
        })
    ]);

    const teachSkillRatings = new Map();
    if (teachSkills.length) {
        const reviewRows = await prisma.swapReview.findMany({
            where: { revieweeId: userId },
            select: {
                overallRating: true,
                swapClass: {
                    select: {
                        swapRequest: {
                            select: {
                                fromUserId: true,
                                toUserId: true,
                                teachSkillId: true,
                                learnSkillId: true
                            }
                        }
                    }
                }
            }
        });

        const teachSkillIdSet = new Set(teachSkills.map((skill) => skill.id));
        const accumulator = new Map();

        reviewRows.forEach((row) => {
            const swapRequest = row.swapClass?.swapRequest;
            if (!swapRequest) return;

            const taughtUserSkillId = swapRequest.toUserId === userId
                ? swapRequest.learnSkillId
                : swapRequest.fromUserId === userId
                    ? swapRequest.teachSkillId
                    : null;

            if (!taughtUserSkillId || !teachSkillIdSet.has(taughtUserSkillId)) return;

            const current = accumulator.get(taughtUserSkillId) || { total: 0, count: 0 };
            current.total += Number(row.overallRating || 0);
            current.count += 1;
            accumulator.set(taughtUserSkillId, current);
        });

        accumulator.forEach((value, key) => {
            teachSkillRatings.set(key, value.count > 0 ? Number((value.total / value.count).toFixed(1)) : 0);
        });
    }

    const learnProgressByGlobalSkillId = new Map();
    completedClasses.forEach((swapClass) => {
        const req = swapClass.swapRequest;
        if (!req) return;

        const learnedGlobalSkillId = req.fromUserId === userId
            ? req.learnSkill?.skillId
            : req.toUserId === userId
                ? req.teachSkill?.skillId
                : null;

        if (!learnedGlobalSkillId) return;
        learnProgressByGlobalSkillId.set(learnedGlobalSkillId, (learnProgressByGlobalSkillId.get(learnedGlobalSkillId) || 0) + 1);
    });

    const completedDates = completedClasses.map((item) => item.completion?.completedAt || item.endedAt).filter(Boolean);
    const averageRating = reviewsAggregate._avg.overallRating ? Number(reviewsAggregate._avg.overallRating.toFixed(1)) : 0;
    const reviewCount = reviewsAggregate._count.overallRating || 0;
    const completedSwaps = user.rewards?.totalSwaps || completedClasses.length;
    const points = user.rewards?.points || 0;
    const profileViews = Number(profileViewsResult || 0);
    const defaultPrivacy = createDefaultPrivacy();
    const profilePrivacy = hasProfileEnhancementModels && user.profilePrivacy
        ? normalizePrivacy(user.profilePrivacy)
        : defaultPrivacy;

    const completion = buildProfileCompletion({
        profile: user.profile,
        teachSkills,
        learnSkills,
        availability: user.availability
    });

    const socialLinks = {
        githubLink: user.profile?.githubLink || null,
        linkedinLink: user.profile?.linkedinLink || null,
        youtubeLink: user.profile?.youtubeLink || null
    };

    const portfolioLinks = [
        { label: 'GitHub Repository', key: 'githubLink', url: user.profile?.githubLink || '' },
        { label: 'Portfolio Website', key: 'portfolioLink', url: user.profile?.portfolioLink || '' },
        { label: 'YouTube Tutorial', key: 'youtubeLink', url: user.profile?.youtubeLink || '' },
        { label: 'LinkedIn Profile', key: 'linkedinLink', url: user.profile?.linkedinLink || '' }
    ]
        .filter((link) => link.url)
        .map((link) => ({
            ...link,
            url: toValidUrl(link.url)
        }));

    const availabilityPreview = buildAvailabilityPreview(user.availability);

    const skillCredibility = teachSkills.map((skill) => ({
        id: skill.id,
        skillId: skill.skillId,
        skillName: skill.skill?.name || '',
        skillLevel: skill.level,
        proofUrl: skill.proofUrl ? toValidUrl(skill.proofUrl) : '',
        videoDemoUrl: skill.preview?.videoUrl || '',
        rating: teachSkillRatings.get(skill.id) || 0,
        reviewCount: teachSkillRatings.get(skill.id) ? reviewCount : 0
    }));

    const skillProgress = learnSkills.map((skill) => {
        const completedSessions = learnProgressByGlobalSkillId.get(skill.skillId) || 0;
        return {
            userSkillId: skill.id,
            skillId: skill.skillId,
            skillName: skill.skill?.name || '',
            completedSessions,
            progressPercent: Math.min(100, completedSessions * 20)
        };
    });

    const recentSwapItems = recentSwaps.map((swapClass) => {
        const req = swapClass.swapRequest;
        const partner = req?.fromUserId === userId ? req?.toUser?.username : req?.fromUser?.username;
        const taughtSkillName = req?.fromUserId === userId ? req?.teachSkill?.skill?.name : req?.learnSkill?.skill?.name;
        const learnedSkillName = req?.fromUserId === userId ? req?.learnSkill?.skill?.name : req?.teachSkill?.skill?.name;

        return {
            classId: swapClass.id,
            status: swapClass.status,
            partner: partner || 'Partner',
            taughtSkill: taughtSkillName || null,
            learnedSkill: learnedSkillName || null,
            title: `${learnedSkillName || 'Skill'} session with ${partner || 'partner'}`,
            startedAt: swapClass.startedAt,
            endedAt: swapClass.endedAt
        };
    });

    const { passwordHash, salt, ...userInfo } = user;
    return {
        ...userInfo,
        isAdmin: conf.ADMIN_USER_IDS.includes(userId),
        profileCompletion: completion,
        headerStats: {
            rating: averageRating,
            reviewCount,
            completedSwaps,
            points
        },
        skillCredibility,
        portfolioLinks,
        learningGoals: hasProfileEnhancementModels
            ? (user.learningGoals || []).map((goal) => ({ id: goal.id, goalText: goal.goalText, createdAt: goal.createdAt }))
            : [],
        availabilityPreview,
        reputationMetrics: {
            averageRating,
            reviewCount,
            totalSwaps: completedSwaps,
            learningStreak: computeLearningStreak(completedDates),
            points
        },
        recentSwaps: recentSwapItems,
        skillProgress,
        profilePrivacy,
        profileAnalytics: {
            profileViews,
            swapRequestsReceived,
            matchesFound
        },
        publicProfileLink: `${conf.FRONTEND_URL || 'http://localhost:5173'}/u/${user.username}`,
        socialLinks
    };
};

export const updateProfileService = async (userId, data) => {
    const {
        fullName,
        username,
        bio,
        avatarUrl,
        learningLanguage,
        githubLink,
        linkedinLink,
        portfolioLink,
        youtubeLink,
        timezone,
        upcomingSessions,
        emailRemindersEnabled,
        profileCompleted,
        availability,
        teachingStyle,
        teachingStyles,
        learningGoals,
        profilePrivacy
    } = data;

    const normalizedAvailability = normalizeAvailabilitySlots(availability);

    const normalizedGoals = normalizeGoals(learningGoals);
    const normalizedPrivacy = normalizePrivacy(profilePrivacy);

    // Sanitize rich text fields if provided
    const safeBio = bio ? sanitizeBio(bio) : bio;
    const normalizedTeachingStyles = normalizeTeachingStyles(
        Array.isArray(teachingStyles)
            ? teachingStyles
            : parseTeachingStyles(teachingStyle)
    );

    const serializedTeachingStyles = normalizedTeachingStyles.length > 0
        ? JSON.stringify(normalizedTeachingStyles)
        : null;

    return await prisma.$transaction(async (tx) => {
        if (username) {
            const normalizedUsername = String(username).trim().toLowerCase();

            if (normalizedUsername.length < USERNAME_MIN || normalizedUsername.length > USERNAME_MAX) {
                throw new ValidationError(`Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters`, 'USERNAME_INVALID_LENGTH');
            }

            if (!USERNAME_REGEX.test(normalizedUsername)) {
                throw new ValidationError('Username must contain only lowercase letters, numbers, and underscore (_)', 'USERNAME_INVALID_FORMAT');
            }

            const existing = await tx.users.findFirst({
                where: {
                    username: normalizedUsername,
                    NOT: { userId }
                }
            });

            if (existing) {
                throw new ValidationError('Username already taken', 'USERNAME_EXISTS');
            }

            await tx.users.update({
                where: { userId },
                data: { username: normalizedUsername }
            });
        }

        const profileUpdateData = {
            fullName,
            bio: safeBio,
            avatarUrl,
            learningLanguage,
            githubLink,
            linkedinLink,
            portfolioLink,
            youtubeLink,
            timezone,
            upcomingSessions,
            emailRemindersEnabled,
            profileCompleted,
            teachingStyle: serializedTeachingStyles
        };

        const profileCreateData = {
            userId,
            ...profileUpdateData
        };

        const profile = await tx.userProfile.upsert({
            where: { userId },
            update: profileUpdateData,
            create: profileCreateData
        });

        if (hasProfileEnhancementModels) {
            await tx.profilePrivacy.upsert({
                where: { userId },
                update: {
                    showAvailability: normalizedPrivacy.showAvailability,
                    showPortfolio: normalizedPrivacy.showPortfolio,
                    showSocialLinks: normalizedPrivacy.showSocialLinks
                },
                create: {
                    userId,
                    showAvailability: normalizedPrivacy.showAvailability,
                    showPortfolio: normalizedPrivacy.showPortfolio,
                    showSocialLinks: normalizedPrivacy.showSocialLinks
                }
            });
        }

        if (hasProfileEnhancementModels && Array.isArray(learningGoals)) {
            await tx.learningGoal.deleteMany({ where: { userId } });

            if (normalizedGoals.length > 0) {
                await tx.learningGoal.createMany({
                    data: normalizedGoals.map((goalText) => ({
                        userId,
                        goalText
                    }))
                });
            }
        }

        if (Array.isArray(availability)) {
            await tx.userAvailability.deleteMany({ where: { userId } });

            if (normalizedAvailability.length > 0) {
                await tx.userAvailability.createMany({
                    data: normalizedAvailability.map((slot) => ({
                        userId,
                        dayOfWeek: slot.dayOfWeek,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        timezone: slot.timezone
                    }))
                });
            }
        }

        return profile;
    });
};

export const getPublicProfileService = async (userId, viewerId = null) => {
    if (Number.isInteger(viewerId) && viewerId !== userId) {
        const blocked = await areUsersBlocked(viewerId, userId);
        if (blocked) {
            throw new ForbiddenError('This user is blocked.', 'USER_BLOCKED');
        }
    }

    const user = await prisma.users.findUnique({
        where: { userId },
        select: {
            userId: true,
            isVerified: true,
            username: true,
            createdAt: true,
            profile: true,
            availability: true,
            ...(hasProfileEnhancementModels
                ? {
                    learningGoals: {
                        orderBy: { createdAt: 'desc' }
                    },
                    profilePrivacy: true
                }
                : {}),
            userSkills: {
                include: { skill: true, preview: true }
            },
            badges: {
                include: { badge: true }
            },
            rewards: true
        }
    });

    if (!user) {
        throw new NotFound('User not found');
    }

    if (hasProfileEnhancementModels && Number.isInteger(viewerId) && viewerId !== userId) {
        await prisma.profileView.create({
            data: {
                userId,
                viewerId,
                viewedAt: new Date()
            }
        }).catch(() => {});
    }

    const teachSkills = user.userSkills.filter((skill) => skill.type === 'TEACH');
    const learnSkills = user.userSkills.filter((skill) => skill.type === 'LEARN');
    const isOwner = Number.isInteger(viewerId) && viewerId === user.userId;
    const privacy = hasProfileEnhancementModels
        ? normalizePrivacy(user.profilePrivacy || createDefaultPrivacy())
        : createDefaultPrivacy();
    const canShowAvailability = isOwner || privacy.showAvailability;
    const canShowPortfolio = isOwner || privacy.showPortfolio;
    const canShowSocialLinks = isOwner || privacy.showSocialLinks;

    const [reviewsAggregate, completedSwaps, profileViewsResult, swapRequestsReceived, matchesFound, recentSwaps, penaltyCount] = await Promise.all([
        prisma.swapReview.aggregate({
            where: { revieweeId: user.userId },
            _avg: { overallRating: true },
            _count: { overallRating: true }
        }),
        prisma.swapClass.findMany({
            where: {
                swapRequest: {
                    OR: [{ fromUserId: user.userId }, { toUserId: user.userId }]
                }
            },
            select: {
                id: true,
                status: true,
                startedAt: true,
                endedAt: true,
                completion: {
                    select: { completedAt: true }
                },
                swapRequest: {
                    select: {
                        fromUserId: true,
                        toUserId: true,
                        fromUser: { select: { username: true } },
                        toUser: { select: { username: true } },
                        teachSkill: { include: { skill: true } },
                        learnSkill: { include: { skill: true } }
                    }
                }
            },
            orderBy: { id: 'desc' },
            take: 8
        }),
        hasProfileEnhancementModels ? prisma.profileView.count({ where: { userId: user.userId } }) : Promise.resolve(0),
        prisma.swapRequest.count({ where: { toUserId: user.userId } }),
        prisma.swapRequest.count({
            where: {
                status: 'ACCEPTED',
                OR: [{ toUserId: user.userId }, { fromUserId: user.userId }]
            }
        }),
        prisma.swapClass.findMany({
            where: {
                swapRequest: {
                    OR: [{ fromUserId: user.userId }, { toUserId: user.userId }]
                }
            },
            select: {
                id: true,
                status: true,
                startedAt: true,
                endedAt: true,
                swapRequest: {
                    select: {
                        fromUserId: true,
                        toUserId: true,
                        fromUser: { select: { username: true } },
                        toUser: { select: { username: true } },
                        teachSkill: { include: { skill: true } },
                        learnSkill: { include: { skill: true } }
                    }
                }
            },
            orderBy: { id: 'desc' },
            take: 5
        }),
        prisma.adminPenalty.count({ where: { userId: user.userId } })
    ]);

    const completedDates = completedSwaps
        .filter((swapClass) => swapClass.status === 'COMPLETED')
        .map((swapClass) => swapClass.completion?.completedAt || swapClass.endedAt)
        .filter(Boolean);

    const teachSessionCountByUserSkillId = {};
    const learnSessionCountByUserSkillId = {};

    completedSwaps
        .filter((swapClass) => swapClass.status === 'COMPLETED')
        .forEach((swapClass) => {
            const req = swapClass.swapRequest;
            if (!req) return;

            let taughtUserSkillId = null;
            let learnedUserSkillId = null;

            if (req.fromUserId === user.userId) {
                taughtUserSkillId = req.teachSkill?.id || null;
                learnedUserSkillId = req.learnSkill?.id || null;
            } else if (req.toUserId === user.userId) {
                taughtUserSkillId = req.learnSkill?.id || null;
                learnedUserSkillId = req.teachSkill?.id || null;
            }

            if (taughtUserSkillId) {
                teachSessionCountByUserSkillId[taughtUserSkillId] = (teachSessionCountByUserSkillId[taughtUserSkillId] || 0) + 1;
            }
            if (learnedUserSkillId) {
                learnSessionCountByUserSkillId[learnedUserSkillId] = (learnSessionCountByUserSkillId[learnedUserSkillId] || 0) + 1;
            }
        });

    const averageRating = reviewsAggregate._avg.overallRating ? Number(reviewsAggregate._avg.overallRating.toFixed(1)) : 0;
    const reviewCount = reviewsAggregate._count.overallRating || 0;
    const totalSwaps = user.rewards?.totalSwaps || completedSwaps.filter((c) => c.status === 'COMPLETED').length;
    const points = user.rewards?.points || 0;
    const profileViews = Number(profileViewsResult || 0);

    const skillCredibility = teachSkills.map((skill) => ({
        id: skill.id,
        skillId: skill.skillId,
        skillName: skill.skill?.name || '',
        skillLevel: skill.level,
        proofUrl: skill.proofUrl ? toValidUrl(skill.proofUrl) : '',
        videoDemoUrl: skill.preview?.videoUrl || '',
        rating: averageRating
    }));

    const portfolioLinks = [
        { label: 'GitHub Repository', key: 'githubLink', url: user.profile?.githubLink || '' },
        { label: 'Portfolio Website', key: 'portfolioLink', url: user.profile?.portfolioLink || '' },
        { label: 'YouTube Tutorial', key: 'youtubeLink', url: user.profile?.youtubeLink || '' },
        { label: 'LinkedIn Profile', key: 'linkedinLink', url: user.profile?.linkedinLink || '' }
    ]
        .filter((link) => link.url)
        .filter((link) => canShowPortfolio || (link.key !== 'portfolioLink' && link.key !== 'youtubeLink'))
        .filter((link) => canShowSocialLinks || (link.key !== 'githubLink' && link.key !== 'linkedinLink'))
        .map((link) => ({
            ...link,
            url: toValidUrl(link.url)
        }));

    const socialLinks = {
        githubLink: canShowSocialLinks ? (user.profile?.githubLink || null) : null,
        linkedinLink: canShowSocialLinks ? (user.profile?.linkedinLink || null) : null,
        youtubeLink: canShowPortfolio ? (user.profile?.youtubeLink || null) : null,
        portfolioLink: canShowPortfolio ? (user.profile?.portfolioLink || null) : null
    };

    const learningGoalItems = hasProfileEnhancementModels
        ? (user.learningGoals || []).map((goal) => ({ id: goal.id, goalText: goal.goalText, createdAt: goal.createdAt }))
        : [];

    const skillProgress = learnSkills.map((skill) => ({
        userSkillId: skill.id,
        skillId: skill.skillId,
        skillName: skill.skill?.name || '',
        completedSessions: 0,
        progressPercent: 0
    }));

    const recentSwapItems = recentSwaps.map((swapClass) => {
        const req = swapClass.swapRequest;
        const partner = req?.fromUserId === user.userId ? req?.toUser?.username : req?.fromUser?.username;
        const primarySkill = req?.fromUserId === user.userId
            ? req?.learnSkill?.skill?.name || req?.teachSkill?.skill?.name
            : req?.teachSkill?.skill?.name || req?.learnSkill?.skill?.name;
        const taughtSkillName = req?.fromUserId === user.userId
            ? req?.teachSkill?.skill?.name
            : req?.learnSkill?.skill?.name;
        const learnedSkillName = req?.fromUserId === user.userId
            ? req?.learnSkill?.skill?.name
            : req?.teachSkill?.skill?.name;

        return {
            classId: swapClass.id,
            status: swapClass.status,
            partner: partner || 'Partner',
            taughtSkill: taughtSkillName || null,
            learnedSkill: learnedSkillName || null,
            title: `${primarySkill || 'Skill'} session with ${partner || 'partner'}`,
            startedAt: swapClass.startedAt,
            endedAt: swapClass.endedAt
        };
    });

    const completion = buildProfileCompletion({
        profile: user.profile,
        teachSkills,
        learnSkills,
        availability: user.availability
    });

    const resolvedTeachingStyles = parseTeachingStyles(user.profile?.teachingStyles ?? user.profile?.teachingStyle);

    return {
        userId: user.userId,
        username: user.username,
        createdAt: user.createdAt,
        profile: {
            fullName: user.profile?.fullName || null,
            bio: user.profile?.bio || null,
            avatarUrl: user.profile?.avatarUrl || null,
            learningLanguage: user.profile?.learningLanguage || null,
            githubLink: socialLinks.githubLink,
            linkedinLink: socialLinks.linkedinLink,
            portfolioLink: socialLinks.portfolioLink,
            youtubeLink: socialLinks.youtubeLink,
            teachingStyle: user.profile?.teachingStyle || null,
            teachingStyles: resolvedTeachingStyles
        },
        availability: canShowAvailability ? user.availability : [],
        availabilityPreview: canShowAvailability ? buildAvailabilityPreview(user.availability) : buildAvailabilityPreview([]),
        userSkills: user.userSkills,
        skillCredibility,
        learningGoals: learningGoalItems,
        skillProgress,
        badges: user.badges,
        rewards: user.rewards,
        reputationMetrics: {
            averageRating,
            reviewCount,
            totalSwaps,
            learningStreak: computeLearningStreak(completedDates),
            points
        },
        recentSwaps: recentSwapItems,
        profileCompletion: completion,
        portfolioLinks,
        profilePrivacy: privacy,
        profileAnalytics: {
            profileViews,
            swapRequestsReceived,
            matchesFound
        },
        trustIndicators: {
            verifiedEmail: Boolean(user.isVerified),
            completedSwaps: totalSwaps,
            penaltyCount,
            hasPenalties: penaltyCount > 0
        },
        skillSessionStats: {
            teachSessionCountByUserSkillId,
            learnSessionCountByUserSkillId
        },
        publicProfileLink: `${conf.FRONTEND_URL || 'http://localhost:5173'}/u/${user.username}`,
        interactions: {
            canRequestSwap: !isOwner,
            canSendMessage: !isOwner,
            viewSkillsPath: '/skills'
        }
    };
};

export const getPublicProfileByUsernameService = async (username, viewerId = null) => {
    const normalizedUsername = String(username || '').trim().toLowerCase();

    const user = await prisma.users.findFirst({
        where: { username: normalizedUsername },
        select: {
            userId: true
        }
    });

    if (!user) {
        throw new NotFound('User not found');
    }

    if (Number.isInteger(viewerId) && viewerId !== user.userId) {
        const blocked = await areUsersBlocked(viewerId, user.userId);
        if (blocked) {
            throw new ForbiddenError('This user is blocked.', 'USER_BLOCKED');
        }
    }

    return getPublicProfileService(user.userId, viewerId);
};

export const sendUpcomingReminderService = async (userId) => {
    const user = await prisma.users.findUnique({
        where: { userId },
        include: {
            profile: true,
            availability: true
        }
    });

    if (!user) {
        throw new NotFound('User not found');
    }

    if (!user.profile?.emailRemindersEnabled) {
        throw new ValidationError('Email reminders are disabled', 'REMINDERS_DISABLED');
    }

    const availabilityLines = (user.availability || []).map(
        (slot) => `${slot.dayOfWeek}: ${slot.startTime} - ${slot.endTime} (${slot.timezone})`
    );

    const upcoming = user.profile?.upcomingSessions || 'No upcoming session notes added yet.';
    const text = [
        `Hello ${user.profile?.fullName || user.username},`,
        '',
        'Here is your skill-swap reminder.',
        '',
        'Upcoming sessions:',
        upcoming,
        '',
        'Weekly availability:',
        availabilityLines.length ? availabilityLines.join('\n') : 'No availability slots saved.'
    ].join('\n');

    await sendEmailService(user.email, 'Skill Swap Reminder', text);

    return { message: 'Reminder email sent successfully' };
};

export const getFeaturedProfilesService = async ({ limit = 8, category = '', search = '' } = {}) => {
    const safeLimit = Number.isFinite(Number(limit)) ? Math.min(Math.max(Number(limit), 1), 20) : 8;
    const normalizedCategory = String(category || '').trim();
    const normalizedSearch = String(search || '').trim();

    const users = await prisma.users.findMany({
        where: {
            isVerified: true,
            profile: {
                is: {
                    profileCompleted: true
                }
            },
            userSkills: {
                some: {
                    type: 'TEACH',
                    ...(normalizedCategory ? { skill: { category: normalizedCategory } } : {}),
                    ...(normalizedSearch
                        ? {
                            OR: [
                                { skill: { name: { contains: normalizedSearch } } },
                                { skill: { category: { contains: normalizedSearch } } }
                            ]
                        }
                        : {})
                }
            },
            ...(normalizedSearch
                ? {
                    OR: [
                        { username: { contains: normalizedSearch } },
                        { profile: { is: { fullName: { contains: normalizedSearch } } } }
                    ]
                }
                : {})
        },
        select: {
            userId: true,
            username: true,
            profile: {
                select: {
                    fullName: true,
                    avatarUrl: true
                }
            },
            userSkills: {
                where: {
                    type: {
                        in: ['TEACH', 'LEARN']
                    }
                },
                select: {
                    type: true,
                    skill: {
                        select: {
                            name: true,
                            category: true
                        }
                    }
                }
            },
            rewards: {
                select: {
                    points: true,
                    totalSwaps: true
                }
            }
        },
        orderBy: [
            { createdAt: 'desc' }
        ],
        take: safeLimit
    });

    const userIds = users.map((u) => u.userId);
    const ratingRows = userIds.length
        ? await prisma.swapReview.groupBy({
            by: ['revieweeId'],
            where: { revieweeId: { in: userIds } },
            _avg: { overallRating: true },
            _count: { overallRating: true }
        })
        : [];

    const ratingMap = new Map(ratingRows.map((row) => [
        row.revieweeId,
        {
            avgRating: row._avg.overallRating ? Number(row._avg.overallRating.toFixed(1)) : 0,
            reviewCount: row._count.overallRating || 0
        }
    ]));

    return users.map((u) => {
        const teachSkills = u.userSkills
            .filter((s) => s.type === 'TEACH')
            .map((s) => s.skill?.name)
            .filter(Boolean);

        const learnSkills = u.userSkills
            .filter((s) => s.type === 'LEARN')
            .map((s) => s.skill?.name)
            .filter(Boolean);

        const categories = [...new Set(
            u.userSkills
                .filter((s) => s.type === 'TEACH')
                .map((s) => s.skill?.category)
                .filter(Boolean)
        )];

        const rating = ratingMap.get(u.userId) || { avgRating: 0, reviewCount: 0 };

        return {
            userId: u.userId,
            username: u.username,
            fullName: u.profile?.fullName || '',
            avatarUrl: u.profile?.avatarUrl || '',
            teachSkills,
            learnSkills,
            categories,
            avgRating: rating.avgRating,
            reviewCount: rating.reviewCount,
            points: u.rewards?.points || 0,
            totalSwaps: u.rewards?.totalSwaps || 0
        };
    });
};
