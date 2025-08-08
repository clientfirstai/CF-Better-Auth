import sgMail from '@sendgrid/mail';
import { Resend } from 'resend';
import { config } from 'dotenv';

// Load environment variables
config();

// Email service configuration
interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Initialize email providers
let sendGridConfigured = false;
let resendConfigured = false;
let resend: Resend | null = null;

// Configure SendGrid if API key is provided
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  sendGridConfigured = true;
  console.log('✅ SendGrid email service configured');
}

// Configure Resend if API key is provided
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
  resendConfigured = true;
  console.log('✅ Resend email service configured');
}

// Default from email
const getFromEmail = (): string => {
  return process.env.FROM_EMAIL || 'noreply@yourdomain.com';
};

// Send email using SendGrid
async function sendEmailWithSendGrid(options: EmailOptions): Promise<void> {
  try {
    const msg = {
      to: options.to,
      from: options.from || getFromEmail(),
      subject: options.subject,
      html: options.html
    };

    await sgMail.send(msg);
    console.log(`📧 Email sent successfully to ${options.to} via SendGrid`);
  } catch (error) {
    console.error('SendGrid email error:', error);
    throw new Error('Failed to send email via SendGrid');
  }
}

// Send email using Resend
async function sendEmailWithResend(options: EmailOptions): Promise<void> {
  try {
    if (!resend) {
      throw new Error('Resend not configured');
    }

    await resend.emails.send({
      to: options.to,
      from: options.from || getFromEmail(),
      subject: options.subject,
      html: options.html
    });

    console.log(`📧 Email sent successfully to ${options.to} via Resend`);
  } catch (error) {
    console.error('Resend email error:', error);
    throw new Error('Failed to send email via Resend');
  }
}

// Fallback email service (development/testing)
async function sendEmailFallback(options: EmailOptions): Promise<void> {
  console.log('📧 EMAIL FALLBACK (Development Mode)');
  console.log('To:', options.to);
  console.log('Subject:', options.subject);
  console.log('HTML Content:', options.html);
  console.log('---');
}

// Main email sending function
export async function sendEmail(options: EmailOptions): Promise<void> {
  // Validate input
  if (!options.to || !options.subject || !options.html) {
    throw new Error('Email options must include to, subject, and html');
  }

  // Add branding to email template
  const brandedHtml = addBrandingToEmail(options.html);
  const emailOptions = { ...options, html: brandedHtml };

  // Try sending with configured providers in order of preference
  try {
    if (sendGridConfigured) {
      await sendEmailWithSendGrid(emailOptions);
      return;
    }

    if (resendConfigured) {
      await sendEmailWithResend(emailOptions);
      return;
    }

    // Fallback for development/testing
    if (process.env.NODE_ENV === 'development') {
      await sendEmailFallback(emailOptions);
      return;
    }

    throw new Error('No email service configured');
  } catch (error) {
    console.error('Email sending failed:', error);
    
    // In production, we might want to queue for retry
    if (process.env.NODE_ENV === 'production') {
      // TODO: Add to email queue for retry
      console.error('Email queued for retry (not implemented)');
    }
    
    throw error;
  }
}

// Add branding to email templates
function addBrandingToEmail(htmlContent: string): string {
  const appName = process.env.APP_NAME || 'CF-Better-Auth';
  const appLogoUrl = process.env.APP_LOGO_URL;
  const appPrimaryColor = process.env.APP_PRIMARY_COLOR || '#3B82F6';
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@example.com';

  // Add logo if provided
  const logoHtml = appLogoUrl 
    ? `<img src="${appLogoUrl}" alt="${appName}" style="max-height: 50px; margin-bottom: 20px;">` 
    : '';

  // Wrap content with branded template
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${appName}</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="padding: 40px; text-align: center; border-bottom: 1px solid #eee;">
          ${logoHtml}
          <h1 style="color: ${appPrimaryColor}; margin: 0; font-size: 24px;">${appName}</h1>
        </div>
        <div style="padding: 40px;">
          ${htmlContent}
        </div>
        <div style="padding: 20px 40px; background-color: #f8f9fa; border-top: 1px solid #eee; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This email was sent by <strong>${appName}</strong><br>
            Need help? Contact us at <a href="mailto:${supportEmail}" style="color: ${appPrimaryColor};">${supportEmail}</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Email templates
export const emailTemplates = {
  // Welcome email template
  welcome: (name: string, verifyUrl?: string) => ({
    subject: `Welcome to ${process.env.APP_NAME || 'CF-Better-Auth'}!`,
    html: `
      <h2>Welcome, ${name}!</h2>
      <p>Thank you for signing up. We're excited to have you on board!</p>
      ${verifyUrl ? `
        <p>To get started, please verify your email address:</p>
        <a href="${verifyUrl}" style="display: inline-block; background-color: ${process.env.APP_PRIMARY_COLOR || '#3B82F6'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verify Email</a>
      ` : ''}
      <p>If you have any questions, don't hesitate to reach out!</p>
    `
  }),

  // Email verification template
  verification: (name: string, verifyUrl: string) => ({
    subject: `Verify your email - ${process.env.APP_NAME || 'CF-Better-Auth'}`,
    html: `
      <h2>Verify Your Email</h2>
      <p>Hi ${name},</p>
      <p>Please click the button below to verify your email address:</p>
      <a href="${verifyUrl}" style="display: inline-block; background-color: ${process.env.APP_PRIMARY_COLOR || '#3B82F6'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't sign up for an account, you can safely ignore this email.</p>
    `
  }),

  // Password reset template
  passwordReset: (name: string, resetUrl: string) => ({
    subject: `Reset Your Password - ${process.env.APP_NAME || 'CF-Better-Auth'}`,
    html: `
      <h2>Reset Your Password</h2>
      <p>Hi ${name},</p>
      <p>You requested a password reset for your account. Click the button below to reset your password:</p>
      <a href="${resetUrl}" style="display: inline-block; background-color: ${process.env.APP_PRIMARY_COLOR || '#3B82F6'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
    `
  })
};

// Export email service status
export const emailServiceStatus = {
  sendGrid: sendGridConfigured,
  resend: resendConfigured,
  fallback: !sendGridConfigured && !resendConfigured
};