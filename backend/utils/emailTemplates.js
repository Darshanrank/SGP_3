/**
 * Styled HTML email templates for the Skill Swap Platform.
 */

const baseLayout = (title, bodyContent) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f4f7fa;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">SkillSwap</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                &copy; ${new Date().getFullYear()} SkillSwap Platform. All rights reserved.
              </p>
              <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;">
                You received this email because you have an account on SkillSwap.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const ctaButton = (url, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
  <tr>
    <td style="background:#2563eb;border-radius:8px;padding:14px 32px;">
      <a href="${url}" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">${label}</a>
    </td>
  </tr>
</table>
`;

/**
 * Verification email HTML
 */
export const verificationEmailHtml = (username, verificationLink) => {
    const body = `
      <h2 style="margin:0 0 12px;color:#111827;font-size:20px;">Welcome, ${username}!</h2>
      <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6;">
        Thanks for signing up for SkillSwap. Please verify your email address to get started.
      </p>
      ${ctaButton(verificationLink, 'Verify Email Address')}
      <p style="margin:16px 0 0;color:#6b7280;font-size:13px;line-height:1.5;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${verificationLink}" style="color:#2563eb;word-break:break-all;">${verificationLink}</a>
      </p>
      <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">
        If you didn't create an account, you can safely ignore this email.
      </p>
    `;
    return baseLayout('Verify your email — SkillSwap', body);
};

/**
 * Password reset email HTML
 */
export const passwordResetEmailHtml = (resetLink) => {
    const body = `
      <h2 style="margin:0 0 12px;color:#111827;font-size:20px;">Reset Your Password</h2>
      <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6;">
        We received a request to reset your password. Click the button below to choose a new password. This link expires in <strong>10 minutes</strong>.
      </p>
      ${ctaButton(resetLink, 'Reset Password')}
      <p style="margin:16px 0 0;color:#6b7280;font-size:13px;line-height:1.5;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${resetLink}" style="color:#2563eb;word-break:break-all;">${resetLink}</a>
      </p>
      <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">
        If you didn't request a password reset, you can safely ignore this email.
      </p>
    `;
    return baseLayout('Reset your password — SkillSwap', body);
};
