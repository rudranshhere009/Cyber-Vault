import React, { useEffect, useRef, useState } from 'react';
import './CyberVaultIntro.css';

const LEFT_FEATURES = [
  { id: 'zt', icon: '⬡', title: 'ZERO-TRUST', sub: 'Local-first shield mesh' },
  { id: 'bl', icon: '◈', title: 'BIO LOCK', sub: 'Face & fingerprint access' },
  { id: 'pr', icon: '◎', title: 'P2P RELAY', sub: 'Encrypted peer mesh routing' }
];

const RIGHT_FEATURES = [
  { id: 'ae', icon: '◆', title: 'AES-256', sub: 'Hardened vault encryption' },
  { id: 'ag', icon: '▦', title: 'AUDIT GRID', sub: 'Traceable secure activity' },
  { id: 'dd', icon: '◉', title: 'DEAD DROP', sub: 'Zero-knowledge file transit' }
];

const RIBBON_ITEMS = [
  '⬡ ZERO-TRUST NETWORK',
  '◈ BIOMETRIC LOCK',
  '◆ AES-256 ENCRYPTION',
  '▦ AUDIT TRAIL GRID',
  '◉ DEAD-DROP TRANSIT',
  '◎ P2P MESH RELAY',
  '⬟ VAULT SHARDING',
  '◇ THREAT DETECTION',
  '❖ COLD STORAGE MODE',
  '⊕ KEY ROTATION',
  '⌬ STEALTH PROTOCOL',
  '◐ THREAT MONITORING'
];

const RIBBONS = [
  { pos: 'top', dir: 'ltr', items: RIBBON_ITEMS, dur: 28 },
  { pos: 'bottom', dir: 'rtl', items: [...RIBBON_ITEMS.slice(4), ...RIBBON_ITEMS.slice(0, 4)], dur: 24 },
  { pos: 'left', dir: 'ttb', items: [...RIBBON_ITEMS.slice(2), ...RIBBON_ITEMS.slice(0, 2)], dur: 22 },
  { pos: 'right', dir: 'btt', items: [...RIBBON_ITEMS.slice(6), ...RIBBON_ITEMS.slice(0, 6)], dur: 26 }
];

const Intro = ({ onComplete, onStartTransition, forceMotion = false }) => {
  const [loaded, setLoaded] = useState(false);
  const [buttonReady, setButtonReady] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [hovered, setHovered] = useState(false);
  const completeRef = useRef(null);

  useEffect(() => {
    const t1 = setTimeout(() => setLoaded(true), 100);
    const t2 = setTimeout(() => setButtonReady(true), 1900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(completeRef.current);
    };
  }, []);

  const handleEnter = () => {
    if (transitioning) return;
    setTransitioning(true);
    if (onStartTransition) onStartTransition();
    completeRef.current = setTimeout(() => {
      if (onComplete) onComplete();
    }, 1600);
  };

  return (
    <div className={`cv-root ${loaded ? 'cv-loaded' : ''} ${transitioning ? 'cv-opening' : ''} ${forceMotion ? 'cv-force-motion' : ''}`}>
      <div className="cv-bg">
        <div className="cv-grid" />
        <div className="cv-radial" />
        <div className="cv-matrix" aria-hidden="true" />
        {[...Array(18)].map((_, i) => (
          <span
            key={i}
            className="cv-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 7}s`,
              animationDuration: `${5 + Math.random() * 6}s`
            }}
          />
        ))}
      </div>
      <div className="cv-veil" />

      {RIBBONS.map((r) => (
        <div key={r.pos} className={`cv-ribbon cv-ribbon--${r.pos} cv-ribbon--${r.dir}`}>
          <div className="cv-ribbon-track" style={{ animationDuration: `${r.dur}s` }}>
            {[...r.items, ...r.items].map((item, i) => (
              <span key={i} className="cv-ribbon-item">
                {item}
                <span className="cv-ribbon-sep">·</span>
              </span>
            ))}
          </div>
        </div>
      ))}

      <main className="cv-stage">
        <div className="cv-scene">
          <aside className="cv-panel cv-panel--left">
            {LEFT_FEATURES.map((f, i) => (
              <div key={f.id} className="cv-card" style={{ '--di': i }}>
                <div className="cv-card-stripe" />
                <span className="cv-card-icon">{f.icon}</span>
                <div className="cv-card-body">
                  <span className="cv-card-title">{f.title}</span>
                  <span className="cv-card-sub">{f.sub}</span>
                </div>
                <div className="cv-card-connector">
                  <span className="cv-conn-dot" />
                  <span className="cv-conn-line" />
                </div>
              </div>
            ))}
          </aside>

          <div className="cv-cube-wrap">
            <div className="cv-glow-a" />
            <div className="cv-glow-b" />
            <div className="cv-cube-shadow" />
            <div className="cv-cube-persp">
              <div className="cv-cube cv-cube--outer">
                <div className="cv-face cv-face--front" />
                <div className="cv-face cv-face--back" />
                <div className="cv-face cv-face--left" />
                <div className="cv-face cv-face--right" />
                <div className="cv-face cv-face--top" />
                <div className="cv-face cv-face--bottom" />
                <div className="cv-cube cv-cube--inner">
                  <div className="cv-face cv-face--front" />
                  <div className="cv-face cv-face--back" />
                  <div className="cv-face cv-face--left" />
                  <div className="cv-face cv-face--right" />
                  <div className="cv-face cv-face--top" />
                  <div className="cv-face cv-face--bottom" />
                </div>
              </div>
            </div>
          </div>

          <aside className="cv-panel cv-panel--right">
            {RIGHT_FEATURES.map((f, i) => (
              <div key={f.id} className="cv-card cv-card--r" style={{ '--di': i }}>
                <div className="cv-card-connector cv-card-connector--r">
                  <span className="cv-conn-line" />
                  <span className="cv-conn-dot" />
                </div>
                <div className="cv-card-body cv-card-body--r">
                  <span className="cv-card-title">{f.title}</span>
                  <span className="cv-card-sub">{f.sub}</span>
                </div>
                <span className="cv-card-icon">{f.icon}</span>
                <div className="cv-card-stripe cv-card-stripe--r" />
              </div>
            ))}
          </aside>
        </div>

        <div className="cv-title-block">
          <h1 className="cv-title">
            {'CYBER VAULT'.split('').map((ch, i) =>
              ch === ' ' ? (
                <span key={i} className="cv-gap" />
              ) : (
                <span key={i} className="cv-char" style={{ '--ci': i }}>
                  {ch}
                </span>
              )
            )}
          </h1>
        </div>
      </main>

      <div className={`cv-cta-wrap ${buttonReady ? 'cv-cta-show' : ''}`}>
        <button
          className={`cv-btn ${hovered ? 'cv-btn--on' : ''}`}
          onClick={handleEnter}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <span className="cv-btn-fill" />
          <span className="cv-btn-sweep" />
          <span className="cv-btn-edge cv-btn-edge--tl" />
          <span className="cv-btn-edge cv-btn-edge--br" />
          <span className="cv-btn-inner">
            <svg viewBox="0 0 18 18" fill="none" width="15" height="15">
              <rect x="3" y="7.5" width="12" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M6.5 7.5V5.5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="9" cy="12" r="1.3" fill="currentColor" />
            </svg>
            <span className="cv-btn-label">INITIATE ACCESS</span>
            <svg className="cv-btn-arrow" viewBox="0 0 16 16" fill="none" width="13" height="13">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>

    </div>
  );
};

export default Intro;
