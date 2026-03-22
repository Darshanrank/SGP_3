import prisma from '../prisma/client.js';
import { logger } from '../utils/logger.js';
import { createNotificationForUserService } from './notification.service.js';

const REMINDER_WINDOWS_MINUTES = [30, 10];
const LOOKBACK_MS = 60 * 1000;
const LOOKAHEAD_MS = 5 * 1000;
const INTERVAL_MS = 60 * 1000;

let reminderInterval = null;
let cycleInProgress = false;

const formatReminderMessage = (event, minutesBefore) => {
    return `Your ${event.title} session starts in ${minutesBefore} minutes.`;
};

const processReminderWindow = async (minutesBefore, io) => {
    const now = Date.now();
    const target = now + minutesBefore * 60 * 1000;
    const from = new Date(target - LOOKBACK_MS);
    const to = new Date(target + LOOKAHEAD_MS);

    const events = await prisma.calendarEvent.findMany({
        where: {
            eventDate: {
                gte: from,
                lte: to
            }
        },
        include: {
            user: {
                select: {
                    userId: true,
                    username: true
                }
            }
        }
    });

    for (const event of events) {
        try {
            await prisma.calendarReminderLog.create({
                data: {
                    userId: event.userId,
                    calendarEventId: event.id,
                    minutesBefore
                }
            });
        } catch (error) {
            if (error?.code === 'P2002') {
                continue;
            }
            throw error;
        }

        try {
            await createNotificationForUserService({
                userId: event.userId,
                type: 'CLASS_REMINDER',
                message: formatReminderMessage(event, minutesBefore),
                link: '/calendar',
                metadata: {
                    calendarEventId: event.id,
                    minutesBefore,
                    eventDate: event.eventDate
                },
                io
            });
        } catch (error) {
            logger.warn('Failed to send class reminder', {
                userId: event.userId,
                eventId: event.id,
                minutesBefore,
                error: error.message
            });
        }
    }
};

const runReminderCycle = async (io) => {
    if (cycleInProgress) return;
    cycleInProgress = true;

    try {
        for (const minutesBefore of REMINDER_WINDOWS_MINUTES) {
            await processReminderWindow(minutesBefore, io);
        }
    } catch (error) {
        logger.warn('Reminder cycle failed', { error: error.message });
    } finally {
        cycleInProgress = false;
    }
};

export const startClassReminderScheduler = (io) => {
    if (reminderInterval) return;

    runReminderCycle(io).catch(() => {});
    reminderInterval = setInterval(() => {
        runReminderCycle(io).catch(() => {});
    }, INTERVAL_MS);
};
