import { describe, it, expect } from 'vitest';
import { verificationEmailHtml, passwordResetEmailHtml } from '../utils/emailTemplates.js';

describe('Email Templates', () => {
    describe('verificationEmailHtml', () => {
        it('should include username in the greeting', () => {
            const html = verificationEmailHtml('Alice', 'https://example.com/verify/abc');
            expect(html).toContain('Welcome, Alice!');
        });

        it('should include the verification link', () => {
            const link = 'https://example.com/verify/token123';
            const html = verificationEmailHtml('Bob', link);
            expect(html).toContain(link);
        });

        it('should include CTA button text', () => {
            const html = verificationEmailHtml('Charlie', 'https://example.com/verify/abc');
            expect(html).toContain('Verify Email Address');
        });

        it('should include SkillSwap branding', () => {
            const html = verificationEmailHtml('Dave', 'https://example.com');
            expect(html).toContain('SkillSwap');
        });

        it('should return valid HTML structure', () => {
            const html = verificationEmailHtml('Eve', 'https://example.com');
            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('</html>');
        });
    });

    describe('passwordResetEmailHtml', () => {
        it('should include the reset link', () => {
            const link = 'https://example.com/reset/abc123';
            const html = passwordResetEmailHtml(link);
            expect(html).toContain(link);
        });

        it('should include Reset Password button text', () => {
            const html = passwordResetEmailHtml('https://example.com');
            expect(html).toContain('Reset Password');
        });

        it('should mention 10 minutes expiry', () => {
            const html = passwordResetEmailHtml('https://example.com');
            expect(html).toContain('10 minutes');
        });

        it('should include SkillSwap branding', () => {
            const html = passwordResetEmailHtml('https://example.com');
            expect(html).toContain('SkillSwap');
        });
    });
});
