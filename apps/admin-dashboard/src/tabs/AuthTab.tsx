import { useState } from 'react';
import type { ApiResponse, LoginResponse, RegisterResponse, UserProfile } from '../types';

interface AuthTabProps {
  token: string;
  setToken: (token: string) => void;
}

type AuthResponse = ApiResponse<LoginResponse | RegisterResponse | UserProfile>;

export default function AuthTab({ token, setToken }: AuthTabProps) {
  const [email, setEmail] = useState('admin@kidkazz.com');
  const [password, setPassword] = useState('Admin123!');
  const [fullName, setFullName] = useState('Admin User');
  const [userType, setUserType] = useState<'retail' | 'wholesale' | 'admin'>('admin');
  const [response, setResponse] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, userType }),
      });
      const data = await res.json();
      setResponse({ success: res.ok, data });
    } catch (error) {
      setResponse({ success: false, error: (error as Error).message });
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.accessToken) {
        setToken(data.accessToken);
      }
      setResponse({ success: res.ok, data });
    } catch (error) {
      setResponse({ success: false, error: (error as Error).message });
    }
    setLoading(false);
  };

  const handleGetProfile = async () => {
    if (!token) {
      setResponse({ success: false, error: 'Please login first' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setResponse({ success: res.ok, data });
    } catch (error) {
      setResponse({ success: false, error: (error as Error).message });
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="card">
        <h2>👤 User Registration</h2>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@kidkazz.com"
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
          />
        </div>
        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Admin User"
          />
        </div>
        <div className="form-group">
          <label>User Type</label>
          <select value={userType} onChange={(e) => setUserType(e.target.value as 'retail' | 'wholesale' | 'admin')}>
            <option value="admin">Admin</option>
            <option value="retail">Retail Customer</option>
            <option value="wholesale">Wholesale Customer</option>
          </select>
        </div>
        <button className="button" onClick={handleRegister} disabled={loading}>
          {loading ? 'Processing...' : '📝 Register'}
        </button>
      </div>

      <div className="card">
        <h2>🔐 User Login</h2>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="button" onClick={handleLogin} disabled={loading}>
          {loading ? 'Processing...' : '🔑 Login'}
        </button>
      </div>

      <div className="card">
        <h2>👤 Get Profile</h2>
        <p>Test JWT authentication by fetching your profile</p>
        <button
          className="button button-secondary"
          onClick={handleGetProfile}
          disabled={loading || !token}
        >
          {loading ? 'Loading...' : '📄 Get My Profile'}
        </button>
      </div>

      {response && (
        <div className={`response ${response.success ? 'success' : 'error'}`}>
          <strong>{response.success ? '✅ Success' : '❌ Error'}</strong>
          <pre>{JSON.stringify(response.data || response.error, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
