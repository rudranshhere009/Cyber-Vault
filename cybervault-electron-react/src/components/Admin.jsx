import React, { useState } from 'react';

export default function Admin() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Root0930@');
  const [token, setToken] = useState(null);
  const [insights, setInsights] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [error, setError] = useState(null);
  const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
 

  const panelStyle = {
    width: '100%',
    maxWidth: 900,
    padding: '36px clamp(18px, 3.4vw, 40px)',
    background: 'linear-gradient(145deg, rgba(245, 248, 252, 0.86), rgba(220, 230, 245, 0.74))',
    boxShadow: '0 24px 48px rgba(115, 141, 181, 0.22), inset 0 1px 0 rgba(255,255,255,0.85)',
    borderRadius: 24,
    border: '1px solid rgba(126, 154, 195, 0.3)',
    color: '#24354d',
    fontFamily: 'JetBrains Mono, monospace',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    position: 'relative',
    zIndex: 2,
  };
  const pageStyle = {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    padding: '46px 20px 30px',
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(145deg, #dfe8f5 0%, #c8d8ee 45%, #b7cae5 100%)',
  };
  const auroraOneStyle = {
    position: 'absolute',
    top: '-140px',
    left: '-120px',
    width: 420,
    height: 420,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.72) 0%, rgba(219,232,248,0.18) 60%, transparent 75%)',
    filter: 'blur(12px)',
    zIndex: 0,
    pointerEvents: 'none',
  };
  const auroraTwoStyle = {
    position: 'absolute',
    right: '-180px',
    bottom: '-160px',
    width: 520,
    height: 520,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(150,183,226,0.36) 0%, rgba(176,202,236,0.18) 58%, transparent 76%)',
    filter: 'blur(18px)',
    zIndex: 0,
    pointerEvents: 'none',
  };
  const textureStyle = {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(122,152,193,0.08) 1px, transparent 1px)',
    backgroundSize: '36px 36px, 36px 36px',
    opacity: 0.45,
    zIndex: 1,
    pointerEvents: 'none',
  };

  const labelStyle = { display: 'block', marginBottom: 8, color: '#385174' };
  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.66)',
    border: '1px solid rgba(120,148,191,0.38)',
    borderRadius: 12,
    color: '#1f2f45',
    outline: 'none',
    marginTop: 6,
    boxSizing: 'border-box',
    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.55), 0 8px 18px rgba(126, 154, 195, 0.14)',
    WebkitBoxShadow: '0 0 0 1000px rgba(240,246,255,0.9) inset',
    WebkitTextFillColor: '#1f2f45',
  };
  const rowStyle = { marginBottom: 16 };
  const actionsStyle = { marginTop: 8, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' };
  const buttonBaseStyle = {
    borderRadius: 14,
    border: '1px solid rgba(120,148,191,0.4)',
    boxShadow: '0 10px 20px rgba(126,154,195,0.2)',
    minHeight: 44,
    color: '#223453',
    background: 'linear-gradient(135deg, rgba(248,252,255,0.94), rgba(220,231,246,0.9))',
  };
  const primaryButtonStyle = {
    ...buttonBaseStyle,
    borderColor: 'rgba(108, 139, 189, 0.55)',
    background: 'linear-gradient(135deg, rgba(208,224,246,0.95), rgba(166,195,236,0.94))',
    color: '#17335a',
  };
  const tokenStyle = {
    marginTop: 12,
    padding: '12px 14px',
    background: 'rgba(232,241,252,0.78)',
    borderRadius: 12,
    fontFamily: 'monospace',
    color: '#304867',
    border: '1px solid rgba(120,148,191,0.32)',
  };
  const userListStyle = { marginTop: 14, display: 'grid', gap: 10 };
  const userRowStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: 10,
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    border: '1px solid rgba(120,148,191,0.26)',
    background: 'linear-gradient(145deg, rgba(245,250,255,0.78), rgba(224,235,248,0.62))',
    boxShadow: '0 8px 18px rgba(126, 154, 195, 0.14)',
  };
  const deleteButtonStyle = {
    borderRadius: 12,
    border: '1px solid rgba(235, 94, 112, 0.55)',
    background: 'linear-gradient(135deg, rgba(255,113,132,0.95), rgba(220,72,98,0.95))',
    boxShadow: '0 10px 18px rgba(220,72,98,0.28)',
    color: '#fff',
    minHeight: 42,
  };
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

  async function deleteUser(user) {
    if (!token) {
      setError('Please login as admin first.');
      return;
    }
    const userLabel = user?.email || user?.username || `ID ${user?.id}`;
    const ok = window.confirm(`Delete user ${userLabel}? This removes the user and related local records.`);
    if (!ok) return;

    setDeletingUserId(user.id);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      let j = null;
      try { j = JSON.parse(text); } catch (e) {}
      if (!res.ok) throw new Error((j && j.error) || text || `HTTP ${res.status}`);

      setInsights((prev) => {
        if (!prev || !Array.isArray(prev.users)) return prev;
        return { ...prev, users: prev.users.filter((u) => u.id !== user.id) };
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setDeletingUserId(null);
    }
  }
  

  return (
    <div style={pageStyle}>
      <div style={auroraOneStyle} />
      <div style={auroraTwoStyle} />
      <div style={textureStyle} />
      <div style={panelStyle}>
      <h2 style={{ margin: 0, marginBottom: 12, color: '#6387be', fontSize: 'clamp(30px, 4vw, 38px)' }}>Admin</h2>
      <div style={rowStyle}>
        <label style={labelStyle}>Username</label>
        <input style={inputStyle} autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div style={rowStyle}>
        <label style={labelStyle}>Password</label>
        <input style={inputStyle} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div style={actionsStyle}>
        <button className="cyber-btn" style={buttonBaseStyle} onClick={register}>Register</button>
        <button className="cyber-btn" style={primaryButtonStyle} onClick={login}>Login</button>
        <button className="cyber-btn" style={primaryButtonStyle} onClick={loadInsights} disabled={!token}>Load Insights</button>
      </div>
      {error && <div style={{ color: '#c53753', marginTop: 12 }}>{error}</div>}
      {token && <div style={tokenStyle}><strong>Token:</strong> {token.slice(0,40)}...</div>}
      {insights && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ color: '#5478af', fontSize: 30 }}>Users ({insights.users?.length})</h3>
          <div style={userListStyle}>
            {(insights.users || []).map((user) => (
              <div key={user.id} style={userRowStyle}>
                <div>
                  <div style={{ fontWeight: 700 }}>{user.username || '(no username)'}</div>
                  <div style={{ fontSize: 13, opacity: 0.84 }}>{user.email || '-'}</div>
                  <div style={{ fontSize: 12, opacity: 0.72 }}>Files: {user.fileCount || 0}</div>
                </div>
                <button
                  className="cyber-btn"
                  style={deleteButtonStyle}
                  onClick={() => deleteUser(user)}
                  disabled={!token || deletingUserId === user.id}
                >
                  {deletingUserId === user.id ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            ))}
            {!insights.users?.length && (
              <div style={{ opacity: 0.8 }}>No users found.</div>
            )}
          </div>
          <pre style={{ marginTop: 12, maxHeight: 220, overflow: 'auto', background: 'rgba(232,241,252,0.82)', color: '#304867', border: '1px solid rgba(120,148,191,0.3)', padding: 12, borderRadius: 12 }}>{JSON.stringify(insights, null, 2)}</pre>
        </div>
      )}
      </div>
    </div>
  );
}
