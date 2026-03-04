import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('../prisma/client.js', () => ({
    default: {
        chatRoom: { findUnique: vi.fn(), create: vi.fn() },
        chatMessage: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    },
}));

// Mock assertUserInClass
vi.mock('../utils/assertUserInClass.js', () => ({
    assertUserInClass: vi.fn(),
}));

const prisma = (await import('../prisma/client.js')).default;
const { getMessagesService, sendMessageService } = await import('../services/chat.service.js');

describe('Chat Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getMessagesService', () => {
        it('should return empty when chat room does not exist', async () => {
            prisma.chatRoom.findUnique.mockResolvedValue(null);
            prisma.chatRoom.create.mockResolvedValue({ id: 1, swapClassId: 1 });

            const result = await getMessagesService(1, 1, { skip: 0, take: 20 });

            expect(result.data).toEqual([]);
            expect(result.meta.total).toBe(0);
        });

        it('should return messages in chronological order', async () => {
            prisma.chatRoom.findUnique.mockResolvedValue({ id: 1 });
            const mockMessages = [
                { id: 2, message: 'Second', createdAt: new Date('2025-01-02') },
                { id: 1, message: 'First', createdAt: new Date('2025-01-01') },
            ];
            prisma.chatMessage.findMany.mockResolvedValue(mockMessages);
            prisma.chatMessage.count.mockResolvedValue(2);

            const result = await getMessagesService(1, 1, { skip: 0, take: 20 });

            // The service reverses the array for chronological order
            expect(result.data[0].message).toBe('First');
            expect(result.data[1].message).toBe('Second');
        });
    });

    describe('sendMessageService', () => {
        it('should throw on empty message', async () => {
            await expect(sendMessageService(1, 1, '')).rejects.toThrow('Message is required');
        });

        it('should throw on whitespace-only message', async () => {
            await expect(sendMessageService(1, 1, '   ')).rejects.toThrow('Message is required');
        });

        it('should sanitize HTML from message', async () => {
            prisma.chatRoom.findUnique.mockResolvedValue({ id: 1 });
            prisma.chatMessage.create.mockImplementation(({ data }) => ({
                id: 1,
                ...data,
                sender: { username: 'test' },
            }));

            await sendMessageService(1, 1, '<script>alert("xss")</script>Hello');

            const createCall = prisma.chatMessage.create.mock.calls[0][0];
            expect(createCall.data.message).not.toContain('<script>');
            expect(createCall.data.message).toContain('Hello');
        });

        it('should create chat room if not exists', async () => {
            prisma.chatRoom.findUnique.mockResolvedValue(null);
            prisma.chatRoom.create.mockResolvedValue({ id: 99 });
            prisma.chatMessage.create.mockResolvedValue({ id: 1, message: 'Hi' });

            await sendMessageService(1, 1, 'Hi');

            expect(prisma.chatRoom.create).toHaveBeenCalled();
        });
    });
});
