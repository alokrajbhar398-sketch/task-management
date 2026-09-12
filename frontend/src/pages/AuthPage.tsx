import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import './AuthPage.css';

interface AuthPageProps {
  onAuth: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const data = await authApi.login(email, password);
        if (data.token) {
          login(data.token, data.user);
          onAuth();
        } else {
          setError(data.message || 'Invalid credentials. (Make sure MySQL is running)');
        }
      } else {
        const data = await authApi.register(name, email, password, role);
        if (data.userId) {
          // Auto login after register
          const loginData = await authApi.login(email, password);
          if (loginData.token) {
            login(loginData.token, loginData.user);
            onAuth();
          }
        } else {
          setError(data.message || 'Registration failed.');
        }
      }
    } catch {
      setError('Cannot connect to server. Please ensure the backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-glow glow-1"></div>
      <div className="auth-glow glow-2"></div>

      <div className="auth-card glass-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">T</div>
          <h2 className="gradient-text">TaskFlow</h2>
        </div>

        <h1 className="auth-title">{isLogin ? 'Welcome back' : 'Create account'}</h1>
        <p className="auth-subtitle">
          {isLogin ? 'Sign in to access your workspace' : 'Start managing tasks collaboratively'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                placeholder="Alok Kumar Rajbhar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="alokrajbhar398@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="user">Team Member</option>
                <option value="admin">Admin / Manager</option>
              </select>
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button id="auth-submit-btn" type="submit" className="btn-primary auth-btn" disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              id="auth-toggle-btn"
              className="auth-toggle"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
