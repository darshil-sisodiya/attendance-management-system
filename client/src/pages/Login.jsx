import { useState } from 'react';
import { api } from '../api.js';

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { token, user } = await api('/login', { method: 'POST', body: form });
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login card" onSubmit={submit}>
        <span className="logo big">AE</span>
        <h1>AttendEase</h1>
        <p className="muted">Attendance Management System</p>
        <label>
          Username / USN
          <input autoFocus required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        </label>
        <label>
          Password
          <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary">Sign in</button>
        <p className="hint">
          Demo: <code>faculty / faculty123</code> or <code>1nh23cs070 / student123</code>
        </p>
      </form>
    </div>
  );
}
