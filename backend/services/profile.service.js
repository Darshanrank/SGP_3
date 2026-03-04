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

    const normalizedAvailability = Array.isArray(availability)
        ? availability.filter((slot) => slot?.dayOfWeek && slot?.startTime && slot?.endTime && slot?.timezone)
        : [];

    // Sanitize bio if provided
    const safeBio = bio ? sanitizeBio(bio) : bio;

    return await prisma.$transaction(async (tx) => {
        if (username) {
            const existing = await tx.users.findFirst({
                where: {
                    username,
                    NOT: { userId }
                }
            });

            if (existing) {
                throw new ValidationError('Username already taken', 'USERNAME_EXISTS');
            }

            await tx.users.update({
                where: { userId },
                data: { username }
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
                        dayOfWeek: String(slot.dayOfWeek).toUpperCase(),
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
            }
        }
    });

    if (!user) {
        throw new NotFound('User not found');
    }
    return user;
};

export const getPublicProfileByUsernameService = async (username) => {
    const user = await prisma.users.findFirst({
        where: { username },
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
            }
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
