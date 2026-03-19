import { NotFound, ValidationError } from '../errors/generic.errors.js';
import { sendEmailService } from './sendEmail.service.js';
import prisma from '../prisma/client.js';
import sanitizeHtml from 'sanitize-html';
import { conf } from '../conf/conf.js';

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
            userSkills: {
                include: { skill: true }
            },
            badges: {
                include: { badge: true }
            }
        }
    });

    if (!user) {
        throw new NotFound('User not found');
    }

    const { passwordHash, salt, ...userInfo } = user;
    return { ...userInfo, isAdmin: conf.ADMIN_USER_IDS.includes(userId) };
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
        availability
    } = data;

    const normalizedAvailability = normalizeAvailabilitySlots(availability);

    // Sanitize bio if provided
    const safeBio = bio ? sanitizeBio(bio) : bio;

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

        const profile = await tx.userProfile.upsert({
            where: { userId },
            update: {
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
                profileCompleted
            },
            create: {
                userId,
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
                profileCompleted
            }
        });

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

export const getPublicProfileService = async (userId) => {
    const user = await prisma.users.findUnique({
        where: { userId },
        select: {
            userId: true,
            username: true,
            createdAt: true,
            profile: {
                select: {
                    fullName: true,
                    bio: true,
                    avatarUrl: true,
                    learningLanguage: true,
                    githubLink: true,
                    linkedinLink: true,
                    portfolioLink: true,
                    youtubeLink: true
                }
            },
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
    return user;
};

export const getPublicProfileByUsernameService = async (username) => {
    const normalizedUsername = String(username || '').trim().toLowerCase();

    const user = await prisma.users.findFirst({
        where: { username: normalizedUsername },
        select: {
            userId: true,
            username: true,
            createdAt: true,
            profile: {
                select: {
                    fullName: true,
                    bio: true,
                    avatarUrl: true,
                    learningLanguage: true,
                    githubLink: true,
                    linkedinLink: true,
                    portfolioLink: true,
                    youtubeLink: true
                }
            },
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
    return user;
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
            _avg: { rating: true },
            _count: { rating: true }
        })
        : [];

    const ratingMap = new Map(ratingRows.map((row) => [
        row.revieweeId,
        {
            avgRating: row._avg.rating ? Number(row._avg.rating.toFixed(1)) : 0,
            reviewCount: row._count.rating || 0
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
