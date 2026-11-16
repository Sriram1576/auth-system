const nodemailer = require('nodemailer');

let cachedTransporter = null;

/**
 * Initializes the email transporter.
 * Uses custom SMTP or Gmail if configured in .env.
 * Otherwise, falls back to a real Ethereal test inbox so real emails are dispatched.
 */
const getTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const isGmail = (process.env.SMTP_USER && process.env.SMTP_USER.includes('@gmail.com')) || process.env.SMTP_SERVICE === 'gmail';
    
    if (isGmail) {
      const cleanPass = process.env.SMTP_PASS.replace(/\s+/g, '');
      cachedTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER.trim(),
          pass: cleanPass
        }
      });
      console.log(`📧 Configured Gmail transporter with account: ${process.env.SMTP_USER}`);
      return cachedTransporter;
    }

    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log(`📧 Configured custom SMTP transporter (${process.env.SMTP_HOST}:${process.env.SMTP_PORT})`);
    return cachedTransporter;
  }

  // Fallback: create an on-the-fly Ethereal test account so emails are actually delivered to a real mail server
  console.log('⚠️ No SMTP_USER/SMTP_PASS in .env. Initializing Ethereal test email account...');
  const testAccount = await nodemailer.createTestAccount();
  cachedTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
  console.log(`📧 Ethereal test account created: ${testAccount.user}`);
  return cachedTransporter;
};

/**
 * Sends a real OTP verification email to the user's registered email address.
 * @param {string} toEmail 
 * @param {string} otp 
 * @param {string} fullName 
 */
const sendOTPEmail = async (toEmail, otp, fullName = 'User') => {
  try {
    const transporter = await getTransporter();

    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || '"Auth System" <noreply@authsystem.local>';

    const mailOptions = {
      from: fromAddress,
      to: toEmail,
      subject: `${otp} is your verification code`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: #6366f1; line-height: 48px; color: #ffffff; font-size: 24px;">
              ✉️
            </div>
          </div>
          <h2 style="color: #0f172a; text-align: center; margin-top: 0; font-size: 22px;">Verify Your Email Address</h2>
          <p style="font-size: 15px; color: #475569; line-height: 1.5;">Hello <strong>${fullName}</strong>,</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.5;">Thank you for creating an account. To complete your registration and secure your profile, please enter this One-Time Password (OTP):</p>
          
          <div style="margin: 28px 0; text-align: center;">
            <div style="display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #4f46e5; background: #f5f3ff; padding: 14px 28px; border-radius: 12px; border: 2px dashed #818cf8;">
              ${otp}
            </div>
          </div>

          <p style="font-size: 13.5px; color: #64748b; line-height: 1.5; text-align: center;">
            ⏱️ This verification code is valid for <strong>10 minutes</strong>.
          </p>
          <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-top: 16px;">
            If you did not request this verification, please disregard this email.
          </p>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0 16px;" />
          <p style="font-size: 12px; color: #cbd5e1; text-align: center;">
            Sent by Secure Auth System &bull; Confidential
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`\n======================================================`);
    console.log(`✉️  [EMAIL DISPATCHED TO: ${toEmail}]`);
    console.log(`Message ID: ${info.messageId}`);
    
    // If sent via Ethereal test inbox, print the URL to view the real email
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 View Delivered Email In Browser: ${previewUrl}`);
    }
    console.log(`======================================================\n`);

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error('❌ Failed to dispatch email:', error);
    throw error;
  }
};

module.exports = {
  sendOTPEmail
};
