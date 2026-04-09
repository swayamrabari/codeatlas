import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

const OTP_EXPIRY_MINUTES = 10;
const DEFAULT_SMTP_HOST = 'smtp-relay.brevo.com';
const DEFAULT_SMTP_PORT = 587;
const DEFAULT_RETRY_ATTEMPTS = 2;
const DEFAULT_RETRY_BACKOFF_MS = 350;
const MAX_RETRY_ATTEMPTS = 4;
const MAX_RETRY_BACKOFF_MS = 5000;
const INTER_FONT_STACK =
  "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

let mailTransporter = null;
let configuredTransportFingerprint = '';

function getEnvString(name, fallback = '') {
  return String(process.env[name] ?? fallback).trim();
}

function getEnvBoolean(name, fallback = false) {
  const value = getEnvString(name);
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function toSafeInteger(rawValue, fallback, min, max) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  return Math.min(Math.max(rounded, min), max);
}

function sanitizeCredential(rawValue) {
  let value = String(rawValue || '').trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  if (value.toLowerCase().startsWith('bearer ')) {
    value = value.slice(7).trim();
  }

  return value.replace(/[\r\n\t]/g, '');
}

function getCredentialFingerprint(value) {
  if (!value) return 'missing';
  if (value.length <= 10) return `${value.slice(0, 2)}...`;
  return `${value.slice(0, 3)}...${value.slice(-4)} (len=${value.length})`;
}

function isConsoleFallbackEnabled() {
  return getEnvBoolean('ALLOW_EMAIL_CONSOLE_FALLBACK', false);
}

function normalizeEmailAddress(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function isLikelyEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtmlWithLineBreaks(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br/>');
}

function getBrevoSmtpConfig() {
  const host =
    getEnvString('BREVO_SMTP_HOST', DEFAULT_SMTP_HOST) || DEFAULT_SMTP_HOST;
  const port = toSafeInteger(
    process.env.BREVO_SMTP_PORT,
    DEFAULT_SMTP_PORT,
    1,
    65535,
  );
  const secure = getEnvBoolean('BREVO_SMTP_SECURE', port === 465);

  const user = sanitizeCredential(
    getEnvString('BREVO_SMTP_USER') || getEnvString('SMTP_USER'),
  );
  const pass = sanitizeCredential(
    getEnvString('BREVO_SMTP_PASS') || getEnvString('SMTP_PASS'),
  );

  return {
    host,
    port,
    secure,
    user,
    pass,
  };
}

function getConfiguredFromEmailCandidate() {
  const primary = normalizeEmailAddress(process.env.BREVO_FROM_EMAIL);
  if (primary) {
    return { email: primary, source: 'BREVO_FROM_EMAIL' };
  }

  const aliases = [
    'SENDGRID_FROM_EMAIL',
    'EMAIL_FROM',
    'FROM_EMAIL',
    'MAIL_FROM',
  ];

  for (const key of aliases) {
    const value = normalizeEmailAddress(process.env[key]);
    if (value) {
      return { email: value, source: key };
    }
  }

  return { email: '', source: 'none' };
}

function getFromEmail() {
  const { email: fromEmail, source } = getConfiguredFromEmailCandidate();

  if (!fromEmail) {
    throw new Error(
      'BREVO_FROM_EMAIL is required when Brevo SMTP credentials are configured. Add a verified sender email in your environment variables.',
    );
  }

  if (!isLikelyEmail(fromEmail)) {
    throw new Error(`${source} appears invalid.`);
  }

  if (source !== 'BREVO_FROM_EMAIL') {
    logger.warn(
      `WARNING: Using ${source} for sender email. Prefer BREVO_FROM_EMAIL for clarity.`,
    );
  }

  return fromEmail;
}

function getFromField() {
  const fromEmail = getFromEmail();
  const fromName =
    getEnvString('BREVO_FROM_NAME') || getEnvString('SENDGRID_FROM_NAME');

  if (!fromName) {
    return fromEmail;
  }

  return {
    email: fromEmail,
    name: fromName.slice(0, 100),
  };
}

function getRetryConfig() {
  const attempts = toSafeInteger(
    process.env.BREVO_RETRY_ATTEMPTS || process.env.SENDGRID_RETRY_ATTEMPTS,
    DEFAULT_RETRY_ATTEMPTS,
    1,
    MAX_RETRY_ATTEMPTS,
  );
  const backoffMs = toSafeInteger(
    process.env.BREVO_RETRY_BACKOFF_MS || process.env.SENDGRID_RETRY_BACKOFF_MS,
    DEFAULT_RETRY_BACKOFF_MS,
    50,
    MAX_RETRY_BACKOFF_MS,
  );

  return { attempts, backoffMs };
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getTransportFingerprint(config) {
  return [
    config.host,
    String(config.port),
    String(config.secure),
    config.user,
    config.pass,
  ].join('|');
}

function ensureBrevoTransporter() {
  const smtp = getBrevoSmtpConfig();

  if (!smtp.user || !smtp.pass) {
    configuredTransportFingerprint = '';
    mailTransporter = null;
    return {
      ready: false,
      reason: 'BREVO_SMTP_USER or BREVO_SMTP_PASS is missing',
    };
  }

  const fingerprint = getTransportFingerprint(smtp);

  if (mailTransporter && configuredTransportFingerprint === fingerprint) {
    return { ready: true };
  }

  mailTransporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  configuredTransportFingerprint = fingerprint;
  logger.info(
    `Email provider configured (Brevo SMTP user=${getCredentialFingerprint(smtp.user)}, host=${smtp.host}:${smtp.port})`,
  );

  return { ready: true };
}

function resolveProviderMode(contextLabel) {
  const smtp = getBrevoSmtpConfig();
  const fallbackEnabled = isConsoleFallbackEnabled();

  if (!smtp.user || !smtp.pass) {
    if (fallbackEnabled) {
      logger.warn(
        `WARNING: Brevo SMTP credentials are not set. Using console fallback for ${contextLabel}.`,
      );
      return {
        mode: 'console',
        reason: 'BREVO_SMTP_USER or BREVO_SMTP_PASS is not set',
      };
    }

    throw new Error(
      'Brevo SMTP credentials are required for email delivery. Configure BREVO_SMTP_USER, BREVO_SMTP_PASS, and BREVO_FROM_EMAIL, or set ALLOW_EMAIL_CONSOLE_FALLBACK=true for local development only.',
    );
  }

  return { mode: 'brevo-smtp' };
}

function extractSmtpErrorDetails(error) {
  const statusCode = Number(error?.responseCode) || 0;
  const code = String(error?.code || '')
    .trim()
    .toUpperCase();
  const response = String(error?.response || '').trim();

  const parts = [];
  if (statusCode) parts.push(`status=${statusCode}`);
  if (code) parts.push(`code=${code}`);
  if (response) parts.push(response);
  if (parts.length === 0 && error?.message) parts.push(String(error.message));

  return {
    statusCode,
    code,
    message: parts.join(' - ') || 'Unknown Brevo SMTP error',
  };
}

function isSmtpAuthError(details) {
  return (
    details.code === 'EAUTH' ||
    details.statusCode === 530 ||
    details.statusCode === 535
  );
}

function isSmtpSenderError(details) {
  return [550, 551, 552, 553, 554].includes(details.statusCode);
}

function isRetryableSmtpError(details) {
  const retryableCodes = ['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'EPROTOCOL'];
  const retryableStatuses = [421, 429, 450, 451, 452];

  if (retryableCodes.includes(details.code)) {
    return true;
  }

  if (retryableStatuses.includes(details.statusCode)) {
    return true;
  }

  return details.statusCode >= 500 && details.statusCode <= 599;
}

function withBrevoAuthHint(message) {
  return `${message}. Verify BREVO_SMTP_USER and BREVO_SMTP_PASS are valid and the service was restarted after secret updates.`;
}

function withBrevoSenderHint(message) {
  return `${message}. Verify BREVO_FROM_EMAIL is a verified sender/domain in Brevo.`;
}

function buildDeliveryErrorMessage(details) {
  if (isSmtpAuthError(details)) {
    return withBrevoAuthHint(details.message);
  }

  if (isSmtpSenderError(details)) {
    return withBrevoSenderHint(details.message);
  }

  return details.message;
}

function extractSmtpAcceptanceMetadata(sendResult) {
  const accepted = Array.isArray(sendResult?.accepted)
    ? sendResult.accepted
    : [];
  const rejected = Array.isArray(sendResult?.rejected)
    ? sendResult.rejected
    : [];

  return {
    acceptedCount: accepted.length,
    rejectedCount: rejected.length,
    messageId: sendResult?.messageId || 'unknown',
    response: sendResult?.response || '',
  };
}

async function sendThroughBrevoSmtp({ contextLabel, payload }) {
  const { attempts, backoffMs } = getRetryConfig();
  let lastErrorMessage = '';

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const sendResult = await mailTransporter.sendMail(payload);
      const acceptedMeta = extractSmtpAcceptanceMetadata(sendResult);

      if (acceptedMeta.acceptedCount === 0) {
        throw new Error('No recipients accepted by SMTP relay.');
      }

      logger.info(`Brevo SMTP accepted ${contextLabel}`, {
        acceptedCount: acceptedMeta.acceptedCount,
        rejectedCount: acceptedMeta.rejectedCount,
        messageId: acceptedMeta.messageId,
        attempt,
      });

      if (attempt > 1) {
        logger.info(
          `Email send recovered on retry (${contextLabel}, attempt ${attempt}/${attempts}).`,
        );
      }

      return acceptedMeta;
    } catch (error) {
      const details = extractSmtpErrorDetails(error);
      const enrichedMessage = buildDeliveryErrorMessage(details);
      lastErrorMessage = enrichedMessage;

      const retryable = isRetryableSmtpError(details);
      const canRetry = retryable && attempt < attempts;

      logger.error(
        `Brevo SMTP ${contextLabel} attempt ${attempt}/${attempts} failed`,
        {
          statusCode: details.statusCode || 'unknown',
          code: details.code || 'unknown',
          message: enrichedMessage,
        },
      );

      if (!canRetry) {
        break;
      }

      await delay(backoffMs * attempt);
    }
  }

  throw new Error(lastErrorMessage || `Brevo SMTP ${contextLabel} failed`);
}

async function sendEmail({
  toEmail,
  subject,
  html,
  text,
  contextLabel,
  fallbackLogger,
  consoleLabel,
}) {
  const recipient = normalizeEmailAddress(toEmail);
  if (!isLikelyEmail(recipient)) {
    throw new Error(`Invalid recipient email: ${toEmail}`);
  }

  let providerMode;
  try {
    providerMode = resolveProviderMode(contextLabel);
    if (providerMode.mode === 'brevo-smtp') {
      const initResult = ensureBrevoTransporter();
      if (!initResult.ready) {
        throw new Error(
          initResult.reason || 'Brevo SMTP transporter is not ready',
        );
      }
    }
  } catch (error) {
    if (!isConsoleFallbackEnabled()) {
      throw error;
    }

    fallbackLogger(error.message);
    return { delivered: false, mode: 'console-fallback' };
  }

  if (providerMode.mode === 'console') {
    fallbackLogger(providerMode.reason);
    return { delivered: false, mode: 'console' };
  }

  try {
    await sendThroughBrevoSmtp({
      contextLabel,
      payload: {
        to: recipient,
        from: getFromField(),
        subject,
        html,
        text,
      },
    });

    logger.info(`Email sent (${consoleLabel}) to ${recipient}`);
    return { delivered: true, mode: 'brevo-smtp' };
  } catch (error) {
    const detail = String(error?.message || error);
    if (isConsoleFallbackEnabled()) {
      fallbackLogger(`Brevo SMTP failed (${detail})`);
      return { delivered: false, mode: 'console-fallback' };
    }

    throw new Error(`Brevo SMTP ${contextLabel} failed: ${detail}`);
  }
}

function buildCardShell({ subtitle, bodyHtml, footerHtml, maxWidth = 480 }) {
  const logoSvg = `
    <svg width="42" height="34" viewBox="0 0 157 127" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="CodeAtlas logo" style="display: block;">
      <path fill="#f5f5f5" d="M110.355 42.625C110.355 45.3864 112.594 47.625 115.355 47.625H152C154.761 47.625 157 49.8636 157 52.625V122C157 124.761 154.761 127 152 127H98.2899C95.5284 127 93.2899 124.761 93.2899 122V77.6675C93.2899 74.8377 89.7314 73.5814 87.9548 75.7841L49.6469 123.278C47.7485 125.632 44.8871 127 41.8633 127H5C2.23858 127 0 124.761 0 122V83.987C0 81.7345 0.760502 79.5479 2.15831 77.7815L60.7074 3.79453C62.604 1.39777 65.4926 0 68.5491 0H105.355C108.116 0 110.355 2.23858 110.355 5V42.625Z" />
    </svg>
  `;

  return `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    </style>
    <div style="font-family: ${INTER_FONT_STACK}; max-width: ${maxWidth}px; margin: 0 auto; padding: 32px 24px; background: radial-gradient(circle at top, #1e1e24 0%, #0a0a0a 45%); border-radius: 14px; border: 1px solid #202028;">
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 10px;">
          ${logoSvg}
          <span style="color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: 0.3px; line-height: 1;">CodeAtlas</span>
        </div>
        <p style="color: #a1a1aa; font-size: 14px; font-weight: 500; margin: 0;">${escapeHtml(subtitle)}</p>
      </div>
      <div style="background: #18181b; border: 1px solid #2f2f37; border-radius: 12px; padding: 24px;">
        ${bodyHtml}
      </div>
      <p style="color: #71717a; font-size: 12px; text-align: center; margin-top: 20px; margin-bottom: 0; line-height: 1.5;">
        ${footerHtml}
      </p>
    </div>
  `;
}

function buildOtpEmailHtml({ subtitle, toName, code, instruction, footer }) {
  const safeName = escapeHtml(toName || 'there');
  const safeCode = escapeHtml(String(code || '').replace(/\s+/g, ''));
  const safeInstruction = escapeHtml(instruction);
  const safeFooter = escapeHtml(footer);

  return buildCardShell({
    subtitle,
    bodyHtml: `
      <p style="color: #d4d4d8; font-size: 15px; margin: 0 0 8px;">Hey <strong style="color: #fff;">${safeName}</strong>,</p>
      <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 24px;">${safeInstruction}</p>
      <div style="background: #09090b; border: 1px solid #3f3f46; border-radius: 8px; padding: 20px; margin: 0 0 20px; letter-spacing: 8px; font-size: 32px; font-weight: 700; color: #ffffff; font-family: 'Courier New', monospace; text-align: center;">
        ${safeCode}
      </div>
      <p style="color: #71717a; font-size: 12px; margin: 0; text-align: center;">This code expires in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.</p>
    `,
    footerHtml: safeFooter,
  });
}

function buildAdminNoticeHtml({ toName, subject, message }) {
  const safeName = escapeHtml(toName || 'there');
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtmlWithLineBreaks(message);

  return buildCardShell({
    subtitle: 'Admin Notification',
    maxWidth: 560,
    bodyHtml: `
      <p style="color: #d4d4d8; font-size: 15px; margin: 0 0 14px;">Hi <strong style="color: #fff;">${safeName}</strong>,</p>
      <p style="color: #e4e4e7; font-size: 15px; margin: 0 0 18px; font-weight: 600;">${safeSubject}</p>
      <div style="color: #c4c4cc; font-size: 14px; line-height: 1.6;">${safeMessage}</div>
    `,
    footerHtml: 'This message was sent by a CodeAtlas administrator.',
  });
}

function logOtpFallback(toEmail, code, label, reason) {
  logger.warn('Email fallback activated', {
    label,
    to: toEmail,
    code,
    expiresInMinutes: OTP_EXPIRY_MINUTES,
    reason: reason || null,
  });
}

function logNoticeFallback(toEmail, subject, message, reason) {
  logger.warn('Email fallback activated', {
    label: 'Admin notification',
    to: toEmail,
    subject,
    message,
    reason: reason || null,
  });
}

export function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function logEmailProviderStatus() {
  const smtp = getBrevoSmtpConfig();
  const { email: fromEmail, source: fromEmailSource } =
    getConfiguredFromEmailCandidate();

  if (!smtp.user || !smtp.pass) {
    if (isConsoleFallbackEnabled()) {
      logger.warn(
        'Email provider in console fallback mode: Brevo SMTP credentials are missing.',
      );
      return;
    }

    logger.warn(
      'Email provider not configured: BREVO_SMTP_USER or BREVO_SMTP_PASS is missing.',
    );
    return;
  }

  if (!fromEmail) {
    logger.warn(
      'Email provider not fully configured: BREVO_FROM_EMAIL is missing.',
    );
    return;
  }

  if (!isLikelyEmail(fromEmail)) {
    logger.warn(
      'Email provider misconfigured: BREVO_FROM_EMAIL format looks invalid.',
    );
    return;
  }

  logger.info(
    `Email provider ready (Brevo SMTP user=${getCredentialFingerprint(smtp.user)}, host=${smtp.host}:${smtp.port}, from=${fromEmail}, source=${fromEmailSource})`,
  );
}

export async function sendVerificationEmail(toEmail, name, code) {
  const htmlContent = buildOtpEmailHtml({
    subtitle: 'Email Verification',
    toName: name,
    code,
    instruction: 'Use the code below to verify your email address:',
    footer:
      'If you did not create a CodeAtlas account, you can ignore this email.',
  });

  const textContent = [
    `Hey ${name || 'there'},`,
    '',
    'Use the code below to verify your email address:',
    String(code),
    '',
    `This code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
  ].join('\n');

  return sendEmail({
    toEmail,
    subject: `${code} is your CodeAtlas verification code`,
    html: htmlContent,
    text: textContent,
    contextLabel: 'verification email delivery',
    consoleLabel: 'verification email',
    fallbackLogger: (reason) => {
      logOtpFallback(toEmail, code, 'Verification email', reason);
    },
  });
}

export async function sendPasswordResetEmail(toEmail, name, code) {
  const htmlContent = buildOtpEmailHtml({
    subtitle: 'Password Reset',
    toName: name,
    code,
    instruction: 'Use the code below to reset your password:',
    footer:
      'If you did not request a password reset, you can ignore this email.',
  });

  const textContent = [
    `Hey ${name || 'there'},`,
    '',
    'Use the code below to reset your password:',
    String(code),
    '',
    `This code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
  ].join('\n');

  return sendEmail({
    toEmail,
    subject: `${code} is your CodeAtlas password reset code`,
    html: htmlContent,
    text: textContent,
    contextLabel: 'password reset email delivery',
    consoleLabel: 'password reset email',
    fallbackLogger: (reason) => {
      logOtpFallback(toEmail, code, 'Password reset email', reason);
    },
  });
}

export async function sendAdminNoticeEmail(toEmail, name, subject, message) {
  const normalizedSubject = String(
    subject || 'Important update from CodeAtlas',
  ).trim();
  const normalizedMessage = String(message || '').trim();

  if (!normalizedMessage) {
    throw new Error('Notification message is required');
  }

  const htmlContent = buildAdminNoticeHtml({
    toName: name,
    subject: normalizedSubject,
    message: normalizedMessage,
  });

  const textContent = [
    `Hi ${name || 'there'},`,
    '',
    normalizedSubject,
    '',
    normalizedMessage,
    '',
    'This message was sent by a CodeAtlas administrator.',
  ].join('\n');

  return sendEmail({
    toEmail,
    subject: normalizedSubject,
    html: htmlContent,
    text: textContent,
    contextLabel: 'admin notification email delivery',
    consoleLabel: 'admin notification',
    fallbackLogger: (reason) => {
      logNoticeFallback(toEmail, normalizedSubject, normalizedMessage, reason);
    },
  });
}
