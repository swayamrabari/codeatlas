import sgMail from '@sendgrid/mail';

let initialized = false;
const isProduction = process.env.NODE_ENV === 'production';

function initSendGrid() {
  if (initialized) return;

  if (!process.env.SENDGRID_API_KEY) {
    console.log(
      '⚠️  No SENDGRID_API_KEY set — OTP codes will be logged to console',
    );
    return;
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('📧 SendGrid configured');
  initialized = true;
}

function getFromEmail() {
  const fromEmail = String(process.env.SENDGRID_FROM_EMAIL || '').trim();

  if (!fromEmail) {
    throw new Error(
      'SENDGRID_FROM_EMAIL is required when SENDGRID_API_KEY is configured. Add a verified sender email in your environment variables.',
    );
  }

  return fromEmail;
}

function extractSendGridErrorMessage(error) {
  const apiErrors = error?.response?.body?.errors;
  if (Array.isArray(apiErrors) && apiErrors.length > 0) {
    return apiErrors
      .map((item) => item?.message)
      .filter(Boolean)
      .join(' | ');
  }

  return error?.message || 'Unknown SendGrid error';
}

function logOtpFallback(toEmail, code, label, reason) {
  console.log(`\n📬 ─────────────────────────────────────────`);
  console.log(`   ${label} for: ${toEmail}`);
  console.log(`   Code: ${code}`);
  console.log(`   Expires in: 10 minutes`);
  if (reason) {
    console.log(`   Fallback reason: ${reason}`);
  }
  console.log(`───────────────────────────────────────────\n`);
}

/**
 * Generate a random 6-digit verification code
 */
export function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send a verification email with the 6-digit code
 * @param {string} toEmail - Recipient email address
 * @param {string} name - User's name
 * @param {string} code - 6-digit verification code
 */
export async function sendVerificationEmail(toEmail, name, code) {
  initSendGrid();

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0a0a0a; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">CodeAtlas</h1>
        <p style="color: #a1a1aa; font-size: 14px; margin-top: 4px;">Email Verification</p>
      </div>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 32px; text-align: center;">
        <p style="color: #d4d4d8; font-size: 15px; margin: 0 0 8px;">Hey <strong style="color: #fff;">${name}</strong>,</p>
        <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 24px;">Use the code below to verify your email address:</p>
        <div style="background: #09090b; border: 1px solid #3f3f46; border-radius: 8px; padding: 20px; margin: 0 0 24px; letter-spacing: 8px; font-size: 32px; font-weight: 700; color: #ffffff; font-family: 'Courier New', monospace;">
          ${code}
        </div>
        <p style="color: #71717a; font-size: 12px; margin: 0;">This code expires in <strong>10 minutes</strong>.</p>
      </div>
      <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 24px;">
        If you didn't create a CodeAtlas account, you can safely ignore this email.
      </p>
    </div>
  `;

  if (!process.env.SENDGRID_API_KEY) {
    // Dev fallback: log the code to console
    logOtpFallback(toEmail, code, 'Verification email');
    return { delivered: false, mode: 'console' };
  }

  try {
    await sgMail.send({
      to: toEmail,
      from: getFromEmail(),
      subject: `${code} is your CodeAtlas verification code`,
      html: htmlContent,
    });
    console.log(`📧 Verification email sent to ${toEmail}`);
    return { delivered: true, mode: 'sendgrid' };
  } catch (error) {
    const message = extractSendGridErrorMessage(error);
    console.error('❌ SendGrid verification email error:', {
      toEmail,
      message,
    });

    if (!isProduction) {
      logOtpFallback(
        toEmail,
        code,
        'Verification email',
        `SendGrid failed (${message})`,
      );
      return { delivered: false, mode: 'console-fallback' };
    }

    throw error;
  }
}

/**
 * Send a password reset email with a 6-digit OTP code.
 * @param {string} toEmail - Recipient email address
 * @param {string} name - User's name
 * @param {string} code - 6-digit reset code
 */
export async function sendPasswordResetEmail(toEmail, name, code) {
  initSendGrid();

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0a0a0a; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">CodeAtlas</h1>
        <p style="color: #a1a1aa; font-size: 14px; margin-top: 4px;">Password Reset</p>
      </div>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 32px; text-align: center;">
        <p style="color: #d4d4d8; font-size: 15px; margin: 0 0 8px;">Hey <strong style="color: #fff;">${name}</strong>,</p>
        <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 24px;">Use the code below to reset your password:</p>
        <div style="background: #09090b; border: 1px solid #3f3f46; border-radius: 8px; padding: 20px; margin: 0 0 24px; letter-spacing: 8px; font-size: 32px; font-weight: 700; color: #ffffff; font-family: 'Courier New', monospace;">
          ${code}
        </div>
        <p style="color: #71717a; font-size: 12px; margin: 0;">This code expires in <strong>10 minutes</strong>.</p>
      </div>
      <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 24px;">
        If you didn't request a password reset, you can ignore this email.
      </p>
    </div>
  `;

  if (!process.env.SENDGRID_API_KEY) {
    logOtpFallback(toEmail, code, 'Password reset email');
    return { delivered: false, mode: 'console' };
  }

  try {
    await sgMail.send({
      to: toEmail,
      from: getFromEmail(),
      subject: `${code} is your CodeAtlas password reset code`,
      html: htmlContent,
    });
    console.log(`📧 Password reset email sent to ${toEmail}`);
    return { delivered: true, mode: 'sendgrid' };
  } catch (error) {
    const message = extractSendGridErrorMessage(error);
    console.error('❌ SendGrid password reset email error:', {
      toEmail,
      message,
    });

    if (!isProduction) {
      logOtpFallback(
        toEmail,
        code,
        'Password reset email',
        `SendGrid failed (${message})`,
      );
      return { delivered: false, mode: 'console-fallback' };
    }

    throw error;
  }
}

/**
 * Send an admin notice email to a user.
 * @param {string} toEmail
 * @param {string} name
 * @param {string} subject
 * @param {string} message
 */
export async function sendAdminNoticeEmail(toEmail, name, subject, message) {
  initSendGrid();

  const safeSubject = String(
    subject || 'Important update from CodeAtlas',
  ).trim();
  const safeMessage = String(message || '').trim();

  if (!safeMessage) {
    throw new Error('Notification message is required');
  }

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0a0a0a; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 28px;">
        <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">CodeAtlas</h1>
        <p style="color: #a1a1aa; font-size: 14px; margin-top: 4px;">Admin Notification</p>
      </div>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 10px; padding: 24px;">
        <p style="color: #d4d4d8; font-size: 15px; margin: 0 0 14px;">Hi <strong style="color: #fff;">${name || 'there'}</strong>,</p>
        <p style="color: #e4e4e7; font-size: 15px; margin: 0 0 18px; font-weight: 600;">${safeSubject}</p>
        <div style="color: #c4c4cc; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${safeMessage}</div>
      </div>
      <p style="color: #71717a; font-size: 12px; text-align: center; margin-top: 20px;">
        This message was sent by a CodeAtlas administrator.
      </p>
    </div>
  `;

  if (!process.env.SENDGRID_API_KEY) {
    console.log(`\n📬 ─────────────────────────────────────────`);
    console.log(`   Admin notification for: ${toEmail}`);
    console.log(`   Subject: ${safeSubject}`);
    console.log(`   Message: ${safeMessage}`);
    console.log(`───────────────────────────────────────────\n`);
    return;
  }

  try {
    await sgMail.send({
      to: toEmail,
      from: getFromEmail(),
      subject: safeSubject,
      html: htmlContent,
    });
    console.log(`📧 Admin notification sent to ${toEmail}`);
  } catch (error) {
    console.error('❌ SendGrid admin notification error:', error.message);
    throw error;
  }
}
