const logger = require('./logger');
require('dotenv').config();

const sendOtpMail = async (toEmail, otp) => {
  try {
    // SendGrid is required - check if API key is configured
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY is required but not set. Please configure SendGrid API key in your environment variables.');
    }

    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // Use EMAIL_FROM if set, otherwise use default
    const fromEmail = process.env.EMAIL_FROM || 'trackitwebapp@gmail.com';

    const msg = {
      to: toEmail,
      from: fromEmail,
      subject: 'Your OTP Code',
      text: `Your OTP code is ${otp}. It is valid for 10 minutes.`,
    };

    await sgMail.send(msg);
    logger.info('OTP email sent successfully via SendGrid', { toEmail, from: fromEmail });
  } catch (error) {
    // Provide more detailed error information for SendGrid errors
    const errorDetails = {
      message: error.message,
      code: error.code,
      response: error.response ? {
        statusCode: error.response.statusCode,
        body: error.response.body,
        headers: error.response.headers
      } : null
    };
    
    logger.error('SendGrid API error', {
      ...errorDetails,
      toEmail,
      from: process.env.EMAIL_FROM || 'trackitwebapp@gmail.com',
      hint: error.response?.statusCode === 403 
        ? 'Forbidden error usually means: 1) Sender email not verified in SendGrid, 2) API key lacks Mail Send permissions, or 3) Invalid API key'
        : error.response?.statusCode === 401
        ? 'Unauthorized: Invalid API key. Check your SENDGRID_API_KEY environment variable.'
        : 'Check SendGrid API key permissions and sender email verification'
    });
    
    // Create user-friendly error messages
    let errorMessage = 'Could not send OTP email';
    if (error.response?.statusCode === 403) {
      errorMessage = `SendGrid Forbidden: The sender email (${process.env.EMAIL_FROM || 'trackitwebapp@gmail.com'}) must be verified in SendGrid. Check your SendGrid dashboard > Settings > Sender Authentication.`;
    } else if (error.response?.statusCode === 401) {
      errorMessage = 'SendGrid Unauthorized: Invalid API key. Check your SENDGRID_API_KEY environment variable.';
    } else if (error.message.includes('SENDGRID_API_KEY is required')) {
      errorMessage = error.message;
    } else {
      errorMessage = `SendGrid error: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
};

module.exports = sendOtpMail;
