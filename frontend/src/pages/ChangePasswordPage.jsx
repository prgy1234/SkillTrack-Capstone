import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { changePassword } from '../api/client.js';

export default function ChangePasswordPage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errors = {};
    if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setUser({ ...user, mustChangePassword: false });
      if (user.role === 'Coordinator') {
        navigate('/dashboard');
      } else {
        navigate('/my-training');
      }
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <main className="change-password-page">
      <div className="change-password-card">
        <h1 className="login-title">Change Password</h1>
        <div className="change-password-info">
          {user?.mustChangePassword ? 'You must change your temporary password before continuing.' : 'Update your account password securely.'}
        </div>

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="current-password">Current Password</label>
            <input
              id="current-password"
              type="password"
              className="form-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              className={`form-input ${fieldErrors.newPassword ? 'error' : ''}`}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
              disabled={loading}
            />
            {fieldErrors.newPassword && (
              <p className="form-error">{fieldErrors.newPassword}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirm New Password</label>
            <input
              id="confirm-password"
              type="password"
              className={`form-input ${fieldErrors.confirmPassword ? 'error' : ''}`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={loading}
            />
            {fieldErrors.confirmPassword && (
              <p className="form-error">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button className="btn-link" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}
