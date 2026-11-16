import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  User, 
  Mail, 
  Hash, 
  ShieldCheck, 
  LogOut, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Calendar
} from 'lucide-react';

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/auth/profile', {
          withCredentials: true
        });
        setUser(response.data.user || response.data);
      } catch (err) {
        setError(err.response?.data?.error || err.response?.data?.message || 'Unauthorized session. Please log in again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await axios.post('http://localhost:5000/api/auth/logout', {}, {
        withCredentials: true
      });
    } catch (e) {
      console.warn('Logout request failed, clearing local session');
    } finally {
      setUser(null);
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center', padding: '50px 30px' }}>
          <Loader2 size={36} className="spinner" style={{ color: '#818cf8', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Verifying Session...</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Authenticating your HTTP-only cookie</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <AlertCircle size={28} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Access Denied</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>{error}</p>
          <button 
            onClick={() => navigate('/login')} 
            className="auth-btn"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="auth-container">
      <div className="profile-card">
        <div className="profile-header-area">
          <div className="avatar-circle">
            {getInitials(user.fullName || user.name)}
          </div>
          <div className="profile-meta">
            <h2>{user.fullName || user.name || 'Authenticated User'}</h2>
            <div className="user-badge">
              <ShieldCheck size={14} />
              <span>Verified Session</span>
            </div>
          </div>
        </div>

        <div className="info-grid">
          <div className="info-box">
            <div className="info-icon">
              <User size={20} />
            </div>
            <div className="info-content">
              <span className="info-label">Full Name</span>
              <span className="info-value">{user.fullName || user.name}</span>
            </div>
          </div>

          <div className="info-box">
            <div className="info-icon">
              <Mail size={20} />
            </div>
            <div className="info-content">
              <span className="info-label">Email Address</span>
              <span className="info-value">{user.email}</span>
            </div>
          </div>

          <div className="info-box">
            <div className="info-icon">
              <Hash size={20} />
            </div>
            <div className="info-content">
              <span className="info-label">User ID</span>
              <span className="info-value">{user.id || 'N/A'}</span>
            </div>
          </div>

          <div className="info-box">
            <div className="info-icon">
              <Lock size={20} />
            </div>
            <div className="info-content">
              <span className="info-label">Authentication</span>
              <span className="info-value">JWT in HTTP-Only Cookie</span>
            </div>
          </div>
        </div>

        <div className="status-pills">
          <div className="pill active">
            <span className="pill-dot"></span>
            <span>Active Session</span>
          </div>
          <div className="pill active">
            <CheckCircle2 size={14} style={{ color: '#86efac' }} />
            <span>Email Verified (OTP)</span>
          </div>
          <div className="pill">
            <CheckCircle2 size={14} style={{ color: '#818cf8' }} />
            <span>Bcrypt Hashed</span>
          </div>
          <div className="pill">
            <CheckCircle2 size={14} style={{ color: '#818cf8' }} />
            <span>JWT HTTP-Only</span>
          </div>
        </div>

        <div className="profile-actions">
          <button 
            onClick={handleLogout} 
            className="btn-logout"
            disabled={loggingOut}
          >
            {loggingOut ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <LogOut size={18} />
                <span>Sign Out</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
