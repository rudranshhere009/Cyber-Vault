import React, { useState, useEffect } from 'react';
import './Welcome.css';

function Welcome({ onContinue }) {
  const [activeCard, setActiveCard] = useState(-1);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const pamphlets = [
    {
      icon: '🔐',
      title: 'Military-Grade Encryption',
      description: 'Your data is protected with AES-256 encryption, ensuring maximum security for your sensitive files.',
      color: '#5d8fc7',
      stat: '256-bit',
      statLabel: 'AES'
    },
    {
      icon: '🧬',
      title: 'Biometric Authentication',
      description: 'Secure access with facial recognition, iris scanning, and fingerprint verification technologies.',
      color: '#79a3d9',
      stat: '3x',
      statLabel: 'Biometric'
    },
    {
      icon: '⚡',
      title: 'Lightning Fast',
      description: 'Experience blazing-fast encryption and decryption with advanced quantum-ready algorithms.',
      color: '#9fb3df',
      stat: '<1ms',
      statLabel: 'Processing'
    },
    {
      icon: '🛡️',
      title: 'Zero-Trust Architecture',
      description: 'Your private keys never leave your device. Complete control over your digital vault.',
      color: '#b2c9e8',
      stat: '100%',
      statLabel: 'Private'
    },
    {
      icon: '📊',
      title: 'Advanced Analytics',
      description: 'Real-time monitoring and insights with comprehensive audit logs and compliance tracking.',
      color: '#a8c4e3',
      stat: 'Real-time',
      statLabel: 'Monitoring'
    },
    {
      icon: '🌐',
      title: 'Cloud Sync',
      description: 'Seamless synchronization across all your devices with end-to-end encryption guarantee.',
      color: '#8bb3d9',
      stat: '∞',
      statLabel: 'Devices'
    },
    {
      icon: '📋',
      title: 'Compliance & Audit',
      description: 'Full compliance with GDPR, HIPAA, and SOC 2 standards with detailed audit trails.',
      color: '#7aa3cf',
      stat: 'Certified',
      statLabel: 'Compliant'
    },
    {
      icon: '🔄',
      title: 'Disaster Recovery',
      description: 'Automated backups with 99.9% uptime guarantee and instant recovery capabilities.',
      color: '#6a93c5',
      stat: '99.9%',
      statLabel: 'Uptime'
    }
  ];

  return (
    <div className="welcome-container">
      {/* Animated Background */}
      <div className="welcome-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
        <div className="gradient-overlay"></div>
      </div>

      {/* Floating Particles */}
      <div className="particles">
        {[...Array(25)].map((_, i) => (
          <div key={i} className="particle"></div>
        ))}
      </div>

      {/* Animated Grid Background */}
      <div className="grid-bg"></div>

      {/* Main Content */}
      <div className="welcome-content">
        {/* Header Section */}
        <div className="welcome-header" style={{ transform: `translateY(${scrollY * 0.3}px)` }}>
          <div className="logo-container">
            <h1 className="welcome-title">
              CYBERVAULT
            </h1>
            <div className="title-aura"></div>
          </div>
          <p className="welcome-description">
            Experience the next generation of secure digital storage powered by military-grade encryption
          </p>
        </div>

        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-icon">🔐</div>
            <span className="stat-value">256-bit</span>
            <span className="stat-label">Encryption</span>
            <div className="stat-glow"></div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <div className="stat-icon">🧬</div>
            <span className="stat-value">3x</span>
            <span className="stat-label">Auth Methods</span>
            <div className="stat-glow"></div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <div className="stat-icon">🛡️</div>
            <span className="stat-value">100%</span>
            <span className="stat-label">Private</span>
            <div className="stat-glow"></div>
          </div>
        </div>

        {/* Pamphlets Section */}
        <div className="pamphlets-section">
          <div className="section-label">Core Features</div>
          <div className="pamphlets-container">
            {pamphlets.map((item, index) => (
              <div
                key={index}
                className="pamphlet"
                style={{
                  '--color': item.color,
                  '--delay': `${index * 0.1}s`,
                  '--index': index
                }}
              >
                <div className="pamphlet-background"></div>
                <div className="pamphlet-inner">
                  <div className="pamphlet-stat">
                    <span className="stat-big">{item.stat}</span>
                    <span className="stat-small">{item.statLabel}</span>
                  </div>
                  <div className="pamphlet-icon">{item.icon}</div>
                  <h3 className="pamphlet-title">{item.title}</h3>
                  <p className="pamphlet-text">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Highlights */}
        <div className="security-section">
          <div className="security-card">
            <div className="security-icon">🔒</div>
            <div className="security-content">
              <h4>End-to-End Encryption</h4>
              <p>All data is encrypted on your device before transmission</p>
            </div>
          </div>
          <div className="security-card">
            <div className="security-icon">🚀</div>
            <div className="security-content">
              <h4>Quantum Ready</h4>
              <p>Future-proof encryption resistant to quantum computing</p>
            </div>
          </div>
          <div className="security-card">
            <div className="security-icon">⚙️</div>
            <div className="security-content">
              <h4>Zero Configuration</h4>
              <p>Works out of the box with advanced security enabled</p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="cta-section">
          <button className="welcome-btn primary" onClick={onContinue}>
            <span className="btn-emoji">🔐</span>
            <span className="btn-text">Access Your Vault</span>
            <span className="btn-arrow">→</span>
          </button>
        </div>

        {/* Bottom Accent */}
        <div className="welcome-accent">
          <div className="accent-line"></div>
          <div className="accent-line"></div>
        </div>
      </div>

      {/* Mouse Glow Effect */}
      <div
        className="mouse-glow"
        style={{
          left: `${mousePosition.x - 50}px`,
          top: `${mousePosition.y - 50}px`
        }}
      ></div>

      {/* Ambient Light */}
      <div className="ambient-light ambient-1"></div>
      <div className="ambient-light ambient-2"></div>
    </div>
  );
}

export default Welcome;
