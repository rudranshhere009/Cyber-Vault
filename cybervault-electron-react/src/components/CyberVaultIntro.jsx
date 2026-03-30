import React, { useEffect, useRef, useState } from 'react';
import './CyberVaultIntro.css';

const FEATURES = [
  {
    icon: '🔒',
    title: 'Zero-Trust Security',
    desc: 'Military-grade AES-256 encryption with local-first architecture. Your data never leaves your device without your explicit permission.'
  },
  {
    icon: '👁️',
    title: 'Biometric Access',
    desc: 'Advanced multi-factor authentication with face, iris, and fingerprint recognition for seamless yet secure access.'
  },
  {
    icon: '📊',
    title: 'Real-time Monitoring',
    desc: 'Comprehensive audit trails and threat detection systems keep you informed of every action in your vault.'
  },
  {
    icon: '🔐',
    title: 'End-to-End Encryption',
    desc: 'Every file is encrypted individually with unique keys, ensuring maximum security even if one key is compromised.'
  },
  {
    icon: '⚡',
    title: 'Lightning Fast',
    desc: 'Optimized performance with instant file access and real-time encryption without sacrificing security.'
  },
  {
    icon: '🌐',
    title: 'Cross-Platform',
    desc: 'Seamlessly sync your secure vault across all your devices with end-to-end encrypted cloud backup.'
  }
];

const STATS = [
  { value: '256-bit', label: 'AES Encryption' },
  { value: '99.99%', label: 'Uptime' },
  { value: '<10ms', label: 'Response Time' },
  { value: 'Zero', label: 'Data Breaches' }
];

const Intro = ({ onComplete, forceMotion = false }) => {
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const completeRef = useRef(null);
  const particlesRef = useRef([]);

  // Countdown sequence
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      const hideTimer = setTimeout(() => {
        setShowCountdown(false);
        setLoaded(true);
      }, 500);
      return () => clearTimeout(hideTimer);
    }
  }, [countdown]);

  // Generate particles
  useEffect(() => {
    const particles = [];
    for (let i = 0; i < 20; i++) {
      particles.push({
        id: i,
        left: `${Math.random() * 100}%`,
        animationDuration: `${15 + Math.random() * 15}s`,
        animationDelay: `${Math.random() * 5}s`,
        drift: `${(Math.random() - 0.5) * 100}px`
      });
    }
    particlesRef.current = particles;
  }, []);

  const handleEnter = () => {
    if (transitioning) return;
    setTransitioning(true);
    completeRef.current = setTimeout(() => {
      if (onComplete) onComplete();
    }, 800);
  };

  return (
    <div className={[
      'cv-root',
      loaded ? 'cv-loaded' : '',
      transitioning ? 'cv-opening' : '',
      forceMotion ? 'cv-force-motion' : ''
    ].filter(Boolean).join(' ')}>

      {/* Film grain overlay */}
      <div className="cv-film-grain" />

      {/* Countdown sequence */}
      {showCountdown && (
        <div className={`cv-countdown ${countdown === 0 ? 'cv-hidden' : ''}`}>
          {countdown > 0 && (
            <div className="cv-countdown-number" key={countdown}>
              {countdown}
            </div>
          )}
        </div>
      )}

      {/* Lens flare effects */}
      <div className="cv-lens-flare">
        <div className="cv-flare-element cv-flare-1" />
        <div className="cv-flare-element cv-flare-2" />
        <div className="cv-flare-element cv-flare-3" />
      </div>

      {/* Background */}
      <div className="cv-bg" />

      {/* Animated grid lines */}
      <div className="cv-grid-lines">
        <div className="cv-grid-line cv-grid-line--h cv-grid-line--1" />
        <div className="cv-grid-line cv-grid-line--h cv-grid-line--2" />
        <div className="cv-grid-line cv-grid-line--h cv-grid-line--3" />
      </div>

      {/* Floating particles */}
      <div className="cv-particles">
        {particlesRef.current.map((particle) => (
          <div
            key={particle.id}
            className="cv-particle"
            style={{
              left: particle.left,
              animationDuration: particle.animationDuration,
              animationDelay: particle.animationDelay,
              '--drift': particle.drift
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="cv-stage">
        {/* Hero Section */}
        <section className="cv-hero">
          {/* Logo */}
          <div className="cv-logo-section">
            <div className="cv-logo-icon">
              <div className="cv-logo-symbol">⬡</div>
            </div>
            <div className="cv-logo-text">CyberVault</div>
          </div>

          {/* Headline */}
          <div className="cv-headline">
            <h1>
              Your Digital Assets,
              <br />
              <span className="cv-headline-highlight">Secured Beyond Limits</span>
            </h1>
          </div>

          {/* Description */}
          <div className="cv-description">
            <p>
              Enterprise-grade security meets elegant simplicity. CyberVault combines
              military-level encryption with intuitive biometric access to create the
              most secure digital vault for your sensitive files.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="cv-cta-group">
            <button className="cv-btn cv-btn-primary" onClick={handleEnter}>
              Enter Vault
            </button>
            <button className="cv-btn cv-btn-secondary">
              Learn More
            </button>
          </div>
        </section>

        {/* Stats Section */}
        <section className="cv-stats">
          <div className="cv-stats-grid">
            {STATS.map((stat, index) => (
              <div key={index} className="cv-stat-item">
                <div className="cv-stat-value">{stat.value}</div>
                <div className="cv-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="cv-features">
          <div className="cv-section-header">
            <div className="cv-section-badge">Features</div>
            <h2 className="cv-section-title">
              Security That Adapts to You
            </h2>
            <p className="cv-section-desc">
              Advanced protection without complexity. Every feature is designed
              to keep you secure while staying out of your way.
            </p>
          </div>

          <div className="cv-feature-grid">
            {FEATURES.map((feature, index) => (
              <div key={index} className="cv-feature-card">
                <div className="cv-feature-icon">{feature.icon}</div>
                <h3 className="cv-feature-title">{feature.title}</h3>
                <p className="cv-feature-desc">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Intro;
