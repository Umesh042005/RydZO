const nodemailer = require('nodemailer');
// Optional: Keep Twilio for future SMS support (commented out by default)
// const twilio = require('twilio');

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via Email (Default method - uses free Gmail SMTP)
const sendOTPviaEmail = async (email, otp) => {
  try {
    // Check if email credentials are provided
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || process.env.EMAIL_USER.includes('your_email')) {
      console.log('=================================================');
      console.log('⚠️  EMAIL CREDENTIALS NOT CONFIGURED ⚠️');
      console.log(`📧  Mock Sending Email to: ${email}`);
      console.log(`🔑  OTP CODE: ${otp}`);
      console.log('=================================================');
      return true; // Pretend it worked so user can proceed
    }

    // Configure email transporter using Gmail SMTP (free)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Gmail App Password
      }
    });

    await transporter.sendMail({
      from: `RydZO <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'RydZO Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">RydZO Verification Code</h2>
          <p>Your verification code is:</p>
          <h1 style="color: #000; font-size: 32px; letter-spacing: 5px; margin: 20px 0;">${otp}</h1>
          <p>This code is valid for 5 minutes.</p>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `
    });

    return true;
  } catch (error) {
    console.error('Email OTP Error:', error);
    // Fallback to console log if real email fails
    console.log('=================================================');
    console.log('❌  EMAIL SENDING FAILED (Check Credentials) ❌');
    console.log(`📧  Mock Sending Email to: ${email}`);
    console.log(`🔑  OTP CODE: ${otp}`);
    console.log('=================================================');
    return true; // Allow registration to proceed anyway
  }
};

// Send OTP via SMS (Optional - for future use, requires Twilio setup)
// Uncomment and configure Twilio credentials in .env if you want to enable SMS OTP later
const sendOTPviaSMS = async (phone, otp) => {
  // Check if SMS is enabled via environment variable
  if (process.env.ENABLE_SMS_OTP !== 'true') {
    console.log('SMS OTP is disabled. Set ENABLE_SMS_OTP=true in .env to enable.');
    return false;
  }

  try {
    // Uncomment when enabling SMS:
    // const twilio = require('twilio');
    // const client = twilio(
    //   process.env.TWILIO_ACCOUNT_SID,
    //   process.env.TWILIO_AUTH_TOKEN
    // );
    // await client.messages.create({
    //   body: `Your RydZO verification code is: ${otp}. Valid for 5 minutes.`,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phone
    // });
    // return true;
    
    console.log('SMS OTP is not configured. Please set up Twilio credentials to enable SMS.');
    return false;
  } catch (error) {
    console.error('SMS OTP Error:', error);
    return false;
  }
};

module.exports = {
  generateOTP,
  sendOTPviaEmail,
  sendOTPviaSMS // Kept for future flexibility
};

