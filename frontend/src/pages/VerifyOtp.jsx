import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  KeyRound, 
  ArrowRight, 
  RotateCw, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck,
  Mail,
  ArrowLeft
} from 'lucide-react';

function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialEmail = location.state?.email || queryParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(60);

  const inputRefs = useRef([]);

  // Resend countdown timer
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Handle single digit input with auto-advance
  const handleDigitChange = (index, value) => {
    const cleanValue = value.replace(/\D/g, ''); // Digits only

    if (!cleanValue) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

    // If user pasted or typed multiple digits
    if (cleanValue.length > 1) {
      const pastedDigits = cleanValue.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedDigits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + pastedDigits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    // Single digit input
    const newOtp = [...otp];
    newOtp[index] = cleanValue;
    setOtp(newOtp);
    setError('');

    // Advance to next input
    if (index < 5 && cleanValue) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace to move to previous box
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste on any box
  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const newOtp = [...otp];
    pasteData.split('').forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);
    inputRefs.current[Math.min(pasteData.length, 5)]?.focus();
  };

  const fullOtp = otp.join('');

  // Submit OTP for verification
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Email address is missing. Please return to registration.');
      return;
    }

    if (fullOtp.length < 6) {
      setError('Please enter all 6 digits of the verification code sent to your email.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/verify-otp',
        { email, otp: fullOtp },
        { withCredentials: true }
      );

      setSuccess(response.data.message || 'Email verified successfully!');

      // Redirect directly to profile with active session
      setTimeout(() => {
        navigate('/profile');
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResend = async () => {
    if (countdown > 0 || resending || !email) return;

    setResending(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/resend-otp', { email });
      setSuccess(response.data.message || 'A new verification code has been sent to your email.');
      setCountdown(60); // Reset cooldown
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-icon-wrapper">
            <KeyRound className="w-6 h-6 text-white" size={28} />
          </div>
          <h1 className="auth-title">Check Your Email</h1>
          <p className="auth-subtitle">
            We've sent a 6-digit verification code to
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '8px',
            padding: '6px 14px',
            background: 'rgba(99, 102, 241, 0.12)',
            borderRadius: '20px',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            fontSize: '13.5px',
            color: '#a5b4fc',
            fontWeight: '600'
          }}>
            <Mail size={14} />
            <span>{email || 'your email'}</span>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '12px', lineHeight: '1.5' }}>
            Please check your inbox (and spam folder) and enter the code below to verify your account.
          </p>
        </div>

        {error && (
          <div className="alert-banner alert-error">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert-banner alert-success">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="auth-form">
          <div className="form-group">
            <label className="form-label" style={{ textAlign: 'center', display: 'block', marginBottom: '8px' }}>
              Enter 6-Digit Code
            </label>
            
            {/* 6 Digit Input Boxes */}
            <div className="otp-inputs-grid" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`otp-digit-box ${digit ? 'filled' : ''}`}
                  autoFocus={index === 0}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={loading || fullOtp.length < 6}>
            {loading ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>Verifying Code...</span>
              </>
            ) : (
              <>
                <span>Verify & Continue</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Resend Section */}
        <div style={{ textAlign: 'center', marginTop: '22px', fontSize: '13.5px', color: '#94a3b8' }}>
          <span>Didn't receive the email? </span>
          {countdown > 0 ? (
            <span style={{ color: '#64748b', fontWeight: '500' }}>
              Resend in <strong style={{ color: '#818cf8' }}>{countdown}s</strong>
            </span>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              style={{
                background: 'none',
                border: 'none',
                color: '#818cf8',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '13.5px'
              }}
            >
              {resending ? (
                <>
                  <Loader2 size={14} className="spinner" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <RotateCw size={14} />
                  <span>Resend Code</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="auth-footer" style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#94a3b8', textDecoration: 'none', fontSize: '13px' }}>
            <ArrowLeft size={14} />
            <span>Back to Sign In</span>
          </Link>
        </div>

        <div className="security-badge">
          <ShieldCheck size={14} />
          <span>Delivered Securely to Your Registered Email</span>
        </div>
      </div>
    </div>
  );
}

export default VerifyOtp;
