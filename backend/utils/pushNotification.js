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
    io.to(`user_${userId}`).emit('new_notification', notification);
};
