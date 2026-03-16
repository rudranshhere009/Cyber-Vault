import React, { useState } from 'react';

export default function Admin() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Root0930@');
  const [token, setToken] = useState(null);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);
  const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
//
  async function register() {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const text = await res.text();
      let j = null;
      try { j = JSON.parse(text); } catch (e) { /* not json */ }
      if (!res.ok) throw new Error((j && j.error) || text || `HTTP ${res.status}`);
      alert('Admin registered');
    } catch (e) { setError(String(e)); }
  }

  async function login() {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const text = await res.text();
      let j = null;
      try { j = JSON.parse(text); } catch (e) {}
      if (!res.ok) throw new Error((j && j.error) || text || `HTTP ${res.status}`);
      setToken(j?.token || null);
    } catch (e) { setError(String(e)); }
  }

  async function loadInsights() {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/insights`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      const text = await res.text();
      let j = null; try { j = JSON.parse(text); } catch (e) {}
      if (!res.ok) throw new Error((j && j.error) || text || `HTTP ${res.status}`);
      setInsights(j);
    } catch (e) { setError(String(e)); }
  }
  

  return (
    <div style={{ padding: 20 }}>
      <h2>Admin</h2>
      <div style={{ marginBottom: 12 }}>
        <label>Username: <input value={username} onChange={(e) => setUsername(e.target.value)} /></label>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Password: <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      </div>
      <div style={{ marginBottom: 12 }}>
        <button onClick={register}>Register</button>
        <button onClick={login} style={{ marginLeft: 8 }}>Login</button>
        <button onClick={loadInsights} style={{ marginLeft: 8 }} disabled={!token}>Load Insights</button>
      </div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {token && <div><strong>Token:</strong> {token.slice(0,40)}...</div>}
      {insights && (
        <div style={{ marginTop: 16 }}>
          <h3>Users ({insights.users?.length})</h3>
          <pre style={{ maxHeight: 240, overflow: 'auto' }}>{JSON.stringify(insights, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
