import React from 'react';
import './Welcome.css';

function Welcome({ onLogin, onSignup, onContinue }) {
  const featurePills = [
    'Encrypted Workspace',
    'Biometric Access',
    'Threat Intelligence',
    'Audit Ready',
  ];

  const modules = [
    {
      title: 'Secure Conversations',
      text: 'Operate in a private, encrypted command space for sensitive files and actions.',
    },
    {
      title: 'Identity Guard',
      text: 'Use password and biometric checkpoints to protect every access attempt.',
    },
    {
      title: 'Operational Memory',
      text: 'Track activity history, anomalies, and trust posture from one interface.',
    },
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
    <div className="welcome-gptx">
      <div className="ambient ambient-a" aria-hidden="true" />
      <div className="ambient ambient-b" aria-hidden="true" />
      <div className="mesh" aria-hidden="true" />

      <header className="top-nav">
        <div className="brand">
          <span className="brand-core" />
          <span className="brand-name">CyberVault</span>
        </div>
        <nav className="nav-links">
          <button type="button">Product</button>
          <button type="button">Security</button>
          <button type="button">Docs</button>
        </nav>
        <div className="nav-actions">
          <button className="nav-btn ghost" onClick={handleLogin}>Log in</button>
          <button className="nav-btn solid" onClick={handleSignup}>Sign up</button>
        </div>
      </header>

      <main className="hero-shell">
        <section className="hero-main">
          <div className="hero-kicker">CyberVault Intelligence Platform</div>
          <h1>
            Secure operations,
            <span>reimagined for modern teams.</span>
          </h1>
          <p>
            A full redesign inspired by GPT-style product pages, now with brighter blue accents and a cleaner, faster path into your vault.
          </p>

          <div className="hero-actions">
            <button className="hero-btn primary" onClick={handleSignup}>Get Started</button>
            <button className="hero-btn secondary" onClick={handleLogin}>Open Vault</button>
          </div>

          <div className="pill-row">
            {featurePills.map((pill) => (
              <span key={pill} className="feature-pill">{pill}</span>
            ))}
          </div>
        </section>

        <section className="hero-panel">
          <div className="panel-head">Live Security Overview</div>
          <div className="signal-line">
            <span className="signal-dot" />
            <span>All systems active</span>
          </div>

          <div className="module-grid">
            {modules.map((item, index) => (
              <article key={item.title} className="module-card" style={{ animationDelay: `${index * 0.12}s` }}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default React.memo(Welcome);
