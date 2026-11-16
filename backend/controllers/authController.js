const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const users = require('../models/users');
const { sendOTPEmail } = require('../utils/emailService');

// Helper to generate a 6-digit numeric OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'All fields (Full Name, Email, Password) are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUserIndex = users.findIndex(u => u.email.toLowerCase() === normalizedEmail);
    if (existingUserIndex !== -1) {
      const existingUser = users[existingUserIndex];
      // If user exists and is already verified, reject
      if (existingUser.isVerified) {
        return res.status(400).json({ error: 'User with this email already exists. Please log in.' });
      }

      // If user exists but NOT verified, update password & resend new OTP
      const saltRounds = 10;
      existingUser.password = await bcrypt.hash(password, saltRounds);
      existingUser.fullName = fullName.trim();
      const otp = generateOTP();
      existingUser.otp = otp;
      existingUser.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

      await sendOTPEmail(normalizedEmail, otp, existingUser.fullName);

      return res.status(200).json({
        message: 'A verification code has been sent to your email address. Please check your inbox.',
        email: normalizedEmail,
        requireVerification: true
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate 6-digit OTP (expires in 10 minutes)
    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    // Save to users array with isVerified: false
    const newUser = {
      id: Date.now().toString(),
      email: normalizedEmail,
      fullName: fullName.trim(),
      password: hashedPassword,
      isVerified: false,
      otp,
      otpExpires
    };
    users.push(newUser);

    // Send email with OTP to user's email address
    await sendOTPEmail(normalizedEmail, otp, newUser.fullName);

    res.status(201).json({
      message: 'Registration successful! A 6-digit verification code has been sent to your email address.',
      email: newUser.email,
      requireVerification: true
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to send verification email. Please check your email configuration.' });
  }
};

// POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      return res.status(404).json({ error: 'Account not found. Please register first.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Email is already verified. Please log in.' });
    }

    // Check if OTP matches
    if (!user.otp || user.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid verification code. Please check the code sent to your email.' });
    }

    // Check expiration
    if (Date.now() > user.otpExpires) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    // Mark as verified and clear OTP fields
    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;

    // Automatically create session / JWT cookie on successful verification
    const payload = { id: user.id, email: user.email, fullName: user.fullName };
    const secret = process.env.JWT_SECRET || 'secretkey';
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });

    res.status(200).json({
      message: 'Email verified successfully! You are now logged in.',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isVerified: true
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Internal server error during verification.' });
  }
};

// POST /api/auth/resend-otp
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Email is already verified. Please log in.' });
    }

    // Generate new OTP & refresh 10 minute timer
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;

    await sendOTPEmail(normalizedEmail, otp, user.fullName);

    res.status(200).json({
      message: 'A fresh 6-digit verification code has been sent to your email address.',
      email: normalizedEmail
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Failed to resend verification email.' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Compare hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Enforce Email Verification!
    if (!user.isVerified) {
      // Send a fresh OTP automatically if previous one expired
      if (!user.otp || Date.now() > user.otpExpires) {
        user.otp = generateOTP();
        user.otpExpires = Date.now() + 10 * 60 * 1000;
        await sendOTPEmail(normalizedEmail, user.otp, user.fullName);
      }

      return res.status(403).json({
        error: 'Your email has not been verified yet. We have sent a verification code to your email inbox.',
        requireVerification: true,
        email: user.email
      });
    }

    // Sign JWT
    const payload = { id: user.id, email: user.email, fullName: user.fullName };
    const secret = process.env.JWT_SECRET || 'secretkey';
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isVerified: true
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
};

// GET /api/auth/profile
const profile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. No active session.' });
    }

    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error during profile fetch.' });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

module.exports = {
  register,
  verifyOTP,
  resendOTP,
  login,
  profile,
  logout
};
