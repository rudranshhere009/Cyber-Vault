import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Welcome.css';

function Welcome({ onContinue }) {
  const containerRef = useRef(null);
  const mouseGlowRef = useRef(null);
  const rafRef = useRef(0);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installMessage, setInstallMessage] = useState('');
  const releasesUrl = 'https://github.com/rudranshhere009/Cyber-Vault/releases/latest';

  const isIOS = useMemo(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(ua);
  }, []);

  const desktopPlatform = useMemo(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    if (ua.includes('windows')) return 'windows';
    if (ua.includes('mac')) return 'mac';
    if (ua.includes('linux')) return 'linux';
    return 'other';
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const isTouchDevice = window.matchMedia?.('(pointer: coarse)')?.matches;
    if (prefersReducedMotion || isTouchDevice) return undefined;

    const handleMouseMove = (e) => {
      if (!mouseGlowRef.current) return;
      const x = e.clientX - 50;
      const y = e.clientY - 50;
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        mouseGlowRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        rafRef.current = 0;
      });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const isTouchDevice = window.matchMedia?.('(pointer: coarse)')?.matches;
    if (prefersReducedMotion || isTouchDevice) return undefined;

    let scrollRaf = 0;
    const handleScroll = () => {
      if (!containerRef.current) return;
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        const offset = window.scrollY * 0.3;
        containerRef.current.style.setProperty('--header-offset', `${offset}px`);
        scrollRaf = 0;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
    };
  }, []);

  useEffect(() => {
    const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone;
    if (standalone) setIsInstalled(true);

    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      setInstallMessage('App installed successfully. Launch CyberVault from your apps list/home screen.');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const pamphlets = useMemo(
    () => [
      {
        icon: '\u{1F512}',
        title: 'Military-Grade Encryption',
        description: 'Your data is protected with AES-256 encryption for high-security local protection.',
        color: '#5d8fc7',
        stat: '256-bit',
        statLabel: 'AES'
      },
      {
        icon: '\u{1F9EC}',
        title: 'Biometric Authentication',
        description: 'Secure access with facial recognition, iris scanning, and fingerprint verification.',
        color: '#79a3d9',
        stat: '3x',
        statLabel: 'Biometric'
      },
      {
        icon: '\u{26A1}',
        title: 'Lightning Fast',
        description: 'Fast encryption and decryption flows optimized for local device use.',
        color: '#9fb3df',
        stat: '<1ms',
        statLabel: 'Processing'
      },
      {
        icon: '\u{1F6E1}\u{FE0F}',
        title: 'Zero-Trust Architecture',
        description: 'Private keys stay on your device. You control your vault data end-to-end.',
        color: '#b2c9e8',
        stat: '100%',
        statLabel: 'Private'
      }
    ],
    []
  );

  const openInstallModal = () => {
    setInstallMessage('');
    setInstallModalOpen(true);
  };

  const handleInstallNow = async () => {
    if (!deferredPrompt) {
      setInstallMessage('Install prompt is not available yet. Use browser menu -> Install app / Add to Home Screen.');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallMessage('Installation started.');
      setInstallModalOpen(false);
    } else {
      setInstallMessage('Install dismissed. You can try again.');
    }

    setDeferredPrompt(null);
    setCanInstall(false);
  };

  const openDesktopDownloads = (platformLabel) => {
    setInstallMessage(`Opening desktop downloads for ${platformLabel}. Choose installer from release assets.`);
    window.open(releasesUrl, '_blank', 'noopener,noreferrer');
  };

  const handleContinueClick = () => onContinue();

  return (
    <div className="welcome-container" ref={containerRef}>
      <div className="welcome-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
        <div className="gradient-overlay"></div>
      </div>

      <div className="particles">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="particle"></div>
        ))}
      </div>

      <div className="grid-bg"></div>

      <button className="install-fab" onClick={openInstallModal} title={isInstalled ? 'App installed' : 'Download app'}>
        {'\u{2B07}\u{FE0F}'}
      </button>

      <div className="welcome-content">
        <div className="welcome-header">
          <div className="logo-container">
            <h1 className="welcome-title">
              <span className="title-word">CYBER</span>
              <span className="title-word">VAULT</span>
            </h1>
          </div>
          <p className="welcome-description">
            Experience secure local storage powered by modern encryption and biometric authentication.
          </p>
        </div>

        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-icon">{'\u{1F512}'}</div>
            <span className="stat-value">256-bit</span>
            <span className="stat-label">Encryption</span>
            <div className="stat-glow"></div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <div className="stat-icon">{'\u{1F9EC}'}</div>
            <span className="stat-value">3x</span>
            <span className="stat-label">Auth Methods</span>
            <div className="stat-glow"></div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <div className="stat-icon">{'\u{1F6E1}\u{FE0F}'}</div>
            <span className="stat-value">100%</span>
            <span className="stat-label">Private</span>
            <div className="stat-glow"></div>
          </div>
        </div>

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

        <div className="security-section">
          <div className="security-card">
            <div className="security-icon">{'\u{1F510}'}</div>
            <div className="security-content">
              <h4>End-to-End Encryption</h4>
              <p>All data is encrypted locally before storage.</p>
            </div>
          </div>
          <div className="security-card">
            <div className="security-icon">{'\u{269B}\u{FE0F}'}</div>
            <div className="security-content">
              <h4>Quantum Ready</h4>
              <p>Future-oriented cryptography baseline for secure storage.</p>
            </div>
          </div>
          <div className="security-card">
            <div className="security-icon">{'\u{2699}\u{FE0F}'}</div>
            <div className="security-content">
              <h4>Zero Configuration</h4>
              <p>Secure defaults with easy onboarding.</p>
            </div>
          </div>
        </div>

        <div className="cta-section">
          <button className="welcome-btn primary" onClick={handleContinueClick}>
            <span className="btn-text">
              <span className="btn-word">Access</span>
              <span className="btn-word">Your</span>
              <span className="btn-word">Vault</span>
            </span>
            <span className="btn-dot" aria-hidden="true">{'\u25CF'}</span>
          </button>
        </div>

        <div className="welcome-accent">
          <div className="accent-line"></div>
          <div className="accent-line"></div>
        </div>
      </div>

      <div className="mouse-glow" ref={mouseGlowRef}></div>
      <div className="ambient-light ambient-1"></div>
      <div className="ambient-light ambient-2"></div>

      {installModalOpen && (
        <div className="install-overlay">
          <div className="install-modal">
            <div className="install-title">{'\u{1F4F2} Install CyberVault App'}</div>
            <div className="install-subtitle">Use CyberVault like a native app on laptop or phone.</div>

            {isInstalled ? (
              <div className="install-note success">CyberVault is already installed on this device.</div>
            ) : canInstall ? (
              <div className="install-note">One-click install is available on this browser.</div>
            ) : (
              <div className="install-note">
                Direct prompt not available. Use browser menu and choose <strong>Install app</strong> or <strong>Add to Home Screen</strong>.
              </div>
            )}

            <div className="install-steps">
              <div>Desktop Chrome/Edge: menu (three dots) -> Install app</div>
              <div>Android Chrome: menu (three dots) -> Install app</div>
              {isIOS && <div>iPhone Safari: Share -> Add to Home Screen</div>}
            </div>

            <div className="install-desktop">
              <div className="install-desktop-title">💻 Desktop App Install</div>
              <div className="install-desktop-sub">
                Recommended: {desktopPlatform === 'windows' ? 'Windows Installer' : desktopPlatform === 'mac' ? 'macOS Build' : desktopPlatform === 'linux' ? 'Linux Build' : 'Latest Release Assets'}
              </div>
              <div className="install-desktop-actions">
                <button className="cyber-btn btn-secondary" onClick={() => openDesktopDownloads('Windows')}>🪟 Windows</button>
                <button className="cyber-btn btn-secondary" onClick={() => openDesktopDownloads('macOS')}>🍎 macOS</button>
                <button className="cyber-btn btn-secondary" onClick={() => openDesktopDownloads('Linux')}>🐧 Linux</button>
              </div>
            </div>

            {installMessage && <div className="install-message">{installMessage}</div>}

            <div className="install-actions">
              <button className="cyber-btn btn-secondary" onClick={() => setInstallModalOpen(false)}>Close</button>
              <button className="cyber-btn btn-primary" onClick={handleInstallNow} disabled={isInstalled}>
                {isInstalled ? 'Installed' : 'Install Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Welcome;

