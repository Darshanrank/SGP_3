import prisma from '../prisma/client.js';
import { NotFound, ForbiddenError } from '../errors/generic.errors.js';

/**
 * Shared helper: verify a user belongs to a swap class.
 * Returns the swapClass record if authorized, otherwise throws.
 */
export const assertUserInClass = async (userId, classId) => {
    const swapClass = await prisma.swapClass.findUnique({
        where: { id: classId },
        include: {
            swapRequest: { select: { fromUserId: true, toUserId: true } }
        }
    });

    if (!swapClass) throw new NotFound('Class not found');

    const isMember = swapClass.swapRequest.fromUserId === userId || swapClass.swapRequest.toUserId === userId;
    if (!isMember) throw new ForbiddenError('Not authorized');

    return swapClass;
};
