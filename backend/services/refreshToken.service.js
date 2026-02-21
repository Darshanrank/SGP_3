import crypto from 'crypto';
import prisma from '../prisma/client.js';
import { signRefreshToken, verifyRefreshToken, signAccessToken } from '../utils/jwt.js';
import { ForbiddenError, AuthError } from '../errors/generic.errors.js';
import { conf } from '../conf/conf.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const decodeExpiry = (token) => {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    try {
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
        if (payload.exp) return new Date(payload.exp * 1000);
    } catch (_) {
        return null;
    }
    return null;
};

export const persistRefreshToken = async ({ userId, token, tokenId, userAgent, ip }) => {
    const expiresAt = decodeExpiry(token);
    if (!expiresAt) {
        throw new AuthError('Invalid refresh token expiry', 'INVALID_REFRESH_EXP');
    }
    const tokenHash = hashToken(token);
    await prisma.refreshToken.create({
        data: {
            tokenId,
            tokenHash,
            userId,
            userAgent,
            ip,
            expiresAt
        }
    });
};

export const rotateRefreshToken = async ({ refreshToken, userAgent, ip }) => {
    let decoded;
    try {
        decoded = verifyRefreshToken(refreshToken);
    } catch (_) {
        throw new AuthError('Invalid refresh token', 'INVALID_REFRESH');
    }
    const tokenId = decoded.tokenId;
    if (!tokenId) {
        throw new AuthError('Invalid refresh token payload', 'INVALID_REFRESH_PAYLOAD');
    }

    const tokenHash = hashToken(refreshToken);

    return await prisma.$transaction(async (tx) => {
        const stored = await tx.refreshToken.findUnique({ where: { tokenId } });
        if (!stored) throw new ForbiddenError('Refresh token not found', 'REFRESH_NOT_FOUND');
        if (stored.revoked) throw new ForbiddenError('Refresh token revoked', 'REFRESH_REVOKED');
        if (stored.tokenHash !== tokenHash) {
            // Possible reuse; revoke all user tokens
            await tx.refreshToken.updateMany({ where: { userId: stored.userId }, data: { revoked: true, revokedAt: new Date() } });
            throw new ForbiddenError('Refresh token reuse detected', 'REFRESH_REUSE');
        }
        if (stored.expiresAt < new Date()) {
            throw new ForbiddenError('Refresh token expired', 'REFRESH_EXPIRED');
        }

        const userId = stored.userId;
        const payload = { userId: userId, email: decoded.email, tokenId: crypto.randomUUID() };
        const newRefreshToken = signRefreshToken(payload);
        const newHash = hashToken(newRefreshToken);
        const newExpiresAt = decodeExpiry(newRefreshToken);

        await tx.refreshToken.update({
            where: { tokenId },
            data: {
                revoked: true,
                revokedAt: new Date(),
                replacedByTokenId: payload.tokenId
            }
        });

        await tx.refreshToken.create({
            data: {
                tokenId: payload.tokenId,
                tokenHash: newHash,
                userId,
                userAgent,
                ip,
                expiresAt: newExpiresAt
            }
        });

        const newAccessToken = signAccessToken({ userId, email: decoded.email });
        return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    });
};

export const revokeRefreshToken = async ({ refreshToken }) => {
    try {
        const decoded = verifyRefreshToken(refreshToken);
        const tokenId = decoded.tokenId;
        if (!tokenId) return;
        await prisma.refreshToken.updateMany({
            where: { tokenId },
            data: { revoked: true, revokedAt: new Date() }
        });
    } catch (_) {
        // ignore invalid token on logout
    }
};

export const revokeAllUserRefreshTokens = async (userId) => {
    await prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true, revokedAt: new Date() } });
};
