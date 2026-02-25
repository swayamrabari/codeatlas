import nodemailer from 'nodemailer';

/**
 * Create a Nodemailer transporter.
 * Uses EMAIL_USER and EMAIL_PASS from env for Gmail SMTP.
 * Falls back to Ethereal (test account) in development if no credentials are set.
 */
let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (emailUser && emailPass) {
    // Real SMTP (Gmail / custom provider)
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
    console.log('📧 Email transporter configured with Gmail SMTP');
  } else {
    // Fallback: log to console in dev mode
    console.log(
      '⚠️  No EMAIL_USER/EMAIL_PASS set — verification codes will be logged to console',
    );
    transporter = null;
  }

  return transporter;
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
  const transport = await getTransporter();

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

  if (!transport) {
    // Dev fallback: log the code to console
    console.log(`\n📬 ─────────────────────────────────────────`);
    console.log(`   Verification email for: ${toEmail}`);
    console.log(`   Code: ${code}`);
    console.log(`   Expires in: 10 minutes`);
    console.log(`───────────────────────────────────────────\n`);
    return;
  }

  await transport.sendMail({
    from: `"CodeAtlas" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `${code} is your CodeAtlas verification code`,
    html: htmlContent,
  });

  console.log(`📧 Verification email sent to ${toEmail}`);
}
