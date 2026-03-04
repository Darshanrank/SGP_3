import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the evaluateCondition function by importing the module and mocking Prisma.
// Since evaluateBadges depends heavily on Prisma, we'll unit-test the condition evaluation logic.

// We need to mock prisma before importing the module
vi.mock('../prisma/client.js', () => ({
    default: {
        userReward: { findUnique: vi.fn() },
        badge: { findMany: vi.fn() },
        userBadge: { findMany: vi.fn(), create: vi.fn() },
        notification: { create: vi.fn() },
    },
}));

const prisma = (await import('../prisma/client.js')).default;
const { evaluateBadges } = await import('../utils/badgeEvaluator.js');

describe('Badge Evaluator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should not crash when user has no rewards', async () => {
        prisma.userReward.findUnique.mockResolvedValue(null);
        prisma.badge.findMany.mockResolvedValue([]);
        prisma.userBadge.findMany.mockResolvedValue([]);

        await expect(evaluateBadges(1)).resolves.not.toThrow();
    });

    it('should award badge when condition met (totalSwaps >= 5)', async () => {
        prisma.userReward.findUnique.mockResolvedValue({ points: 10, totalSwaps: 5 });
        prisma.badge.findMany.mockResolvedValue([
            { id: 1, name: 'First Five', condition: 'totalSwaps >= 5' },
        ]);
        prisma.userBadge.findMany.mockResolvedValue([]); // No existing badges
        prisma.userBadge.create.mockResolvedValue({ id: 1, userId: 1, badgeId: 1 });
        prisma.notification.create.mockResolvedValue({});

        await evaluateBadges(1);

        expect(prisma.userBadge.create).toHaveBeenCalledWith({
            data: { userId: 1, badgeId: 1 },
        });
        expect(prisma.notification.create).toHaveBeenCalled();
    });

    it('should NOT award badge when condition NOT met', async () => {
        prisma.userReward.findUnique.mockResolvedValue({ points: 10, totalSwaps: 3 });
        prisma.badge.findMany.mockResolvedValue([
            { id: 1, name: 'First Five', condition: 'totalSwaps >= 5' },
        ]);
        prisma.userBadge.findMany.mockResolvedValue([]);

        await evaluateBadges(1);

        expect(prisma.userBadge.create).not.toHaveBeenCalled();
    });

    it('should skip badge if user already has it', async () => {
        prisma.userReward.findUnique.mockResolvedValue({ points: 100, totalSwaps: 10 });
        prisma.badge.findMany.mockResolvedValue([
            { id: 1, name: 'First Five', condition: 'totalSwaps >= 5' },
        ]);
        prisma.userBadge.findMany.mockResolvedValue([{ badgeId: 1 }]); // Already earned

        await evaluateBadges(1);

        expect(prisma.userBadge.create).not.toHaveBeenCalled();
    });

    it('should handle points condition (points >= 100)', async () => {
        prisma.userReward.findUnique.mockResolvedValue({ points: 150, totalSwaps: 2 });
        prisma.badge.findMany.mockResolvedValue([
            { id: 2, name: 'Points Master', condition: 'points >= 100' },
        ]);
        prisma.userBadge.findMany.mockResolvedValue([]);
        prisma.userBadge.create.mockResolvedValue({ id: 2, userId: 1, badgeId: 2 });
        prisma.notification.create.mockResolvedValue({});

        await evaluateBadges(1);

        expect(prisma.userBadge.create).toHaveBeenCalledWith({
            data: { userId: 1, badgeId: 2 },
        });
    });
});
