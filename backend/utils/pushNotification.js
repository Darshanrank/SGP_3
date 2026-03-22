/**
 * Push a real-time notification via Socket.io to a specific user.
 * Call from controllers where `req.app.get('io')` is available.
 *
 * @param {import('socket.io').Server} io - Socket.io server instance
 * @param {number} userId - Target user's ID
 * @param {object} notification - The notification object (from DB creation)
 */
export const pushNotification = (io, userId, notification) => {
    if (!io || !userId) return;
    const room = `user_${userId}`;
    io.to(room).emit('new_notification', notification);

    const type = String(notification?.type || '').toUpperCase();
    const eventByType = {
        SWAP_REQUEST: 'swap_request',
        ACCEPTED: 'swap_accepted',
        CLASS_REMINDER: 'class_reminder',
        CHAT_MESSAGE: 'new_message',
        PARTNER_TYPING: 'user_typing',
        PARTNER_ONLINE: 'user_online'
    };

    const mappedEvent = eventByType[type];
    if (mappedEvent) {
        io.to(room).emit(mappedEvent, notification);
    }
};
