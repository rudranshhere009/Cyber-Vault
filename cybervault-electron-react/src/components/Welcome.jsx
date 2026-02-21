import React from 'react';
import './Welcome.css';

function Welcome({ onLogin, onSignup, onContinue }) {
  const highlights = [
    'Zero-trust encryption pipeline',
    'Biometric and password access layers',
    'Enterprise-grade threat visibility',
    'Fast local-first secure workflows',
  ];

  const capabilityCards = [
    {
      label: 'Vault Core',
      title: 'Encryption at every stage',
      text: 'Files are protected during import, storage, and retrieval using hardened security flows.',
    },
    {
      label: 'Identity Layer',
      title: 'Multiple trusted sign-in paths',
      text: 'Use password, face, iris, and fingerprint options based on your security policy.',
    },
    {
      label: 'Ops View',
      title: 'Audit-focused activity tracking',
      text: 'Review patterns, validate events, and monitor account confidence from one place.',
    },
  ];

  const quickStats = [
    { value: '256-BIT', label: 'Encryption' },
    { value: '3 MODES', label: 'Biometrics' },
    { value: '99.9%', label: 'Uptime Ready' },
    { value: '< 1s', label: 'Secure Access' },
  ];

  const handleLogin = () => {
    if (onLogin) {
      onLogin();
      return;
    }
    if (onContinue) onContinue();
  };

  const handleSignup = () => {
    if (onSignup) {
      onSignup();
      return;
    }
    if (onContinue) onContinue();
  };

  return (
    <div className="welcome-root">
      <div className="orange-glow glow-a" aria-hidden="true" />
      <div className="orange-glow glow-b" aria-hidden="true" />
      <div className="mesh-overlay" aria-hidden="true" />
      <div className="scan-overlay" aria-hidden="true" />

      <main className="welcome-layout">
        <section className="showcase">
          <div className="eyebrow">CyberVault Security Suite</div>
          <h1>
            Black-box security.
            <span>Orange-line precision.</span>
          </h1>
          <p>
            A new command-style home experience for teams that need professional security posture, strong identity controls, and clean high-contrast design.
          </p>

          <div className="highlight-list">
            {highlights.map((item) => (
              <div className="highlight-item" key={item}>
                <span className="highlight-dot" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="capability-grid">
            {capabilityCards.map((card, index) => (
              <article className="capability-card" key={card.title} style={{ animationDelay: `${0.15 * index}s` }}>
                <div className="cap-label">{card.label}</div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="access-panel">
          <div className="access-top">
            <div className="access-kicker">Access Gateway</div>
            <h2>Enter CyberVault</h2>
            <p>Choose your route to continue into the secure workspace.</p>
          </div>

          <div className="access-actions">
            <button className="access-btn primary" onClick={handleLogin}>
              Log In
            </button>
            <button className="access-btn secondary" onClick={handleSignup}>
              Sign Up
            </button>
          </div>

          <div className="stats-grid">
            {quickStats.map((stat) => (
              <article className="stat-tile" key={stat.label}>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </article>
            ))}
          </div>

          <div className="status-strip">
            <span className="pulse" />
            <span>Security systems nominal</span>
          </div>
        </section>
      </main>

      <div className="ticker-wrap" aria-hidden="true">
        <div className="ticker-track">
          <span>THREAT MONITOR</span>
          <span>IDENTITY CONFIDENCE</span>
          <span>ZERO TRUST</span>
          <span>AES-256</span>
          <span>AUDIT READY</span>
          <span>THREAT MONITOR</span>
          <span>IDENTITY CONFIDENCE</span>
          <span>ZERO TRUST</span>
          <span>AES-256</span>
          <span>AUDIT READY</span>
        </div>
      </div>
    </div>
  );
}

export default React.memo(Welcome);
