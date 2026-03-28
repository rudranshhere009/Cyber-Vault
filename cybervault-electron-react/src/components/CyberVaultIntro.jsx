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
  { pos: 'top',    dir: 'ltr', items: RIBBON_ITEMS,                                               dur: 28 },
  { pos: 'bottom', dir: 'rtl', items: [...RIBBON_ITEMS.slice(4), ...RIBBON_ITEMS.slice(0, 4)],    dur: 24 },
  { pos: 'left',   dir: 'ttb', items: [...RIBBON_ITEMS.slice(2), ...RIBBON_ITEMS.slice(0, 2)],    dur: 22 },
  { pos: 'right',  dir: 'btt', items: [...RIBBON_ITEMS.slice(6), ...RIBBON_ITEMS.slice(0, 6)],    dur: 26 }
];

const SCAN_ROWS = [
  { key: 'Encryption', val: 'AES-256',   fill: '100%' },
  { key: 'Integrity',  val: 'SHA-3',     fill: '94%'  },
  { key: 'Auth Layer', val: 'BIO + PIN', fill: '88%'  }
];

const TAGS = ['TLS 1.3', 'E2E Encrypted', 'Zero-Trust', 'Air-Gapped'];

/* ── Live ticking clock widget ── */
const VaultClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const pad  = n  => String(n).padStart(2, '0');
  const hh   = pad(now.getHours());
  const mm   = pad(now.getMinutes());
  const ss   = pad(now.getSeconds());
  const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const tz   = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <div className="cv-clock-widget">
      <div className="cv-clock-top">
        <span className="cv-clock-label">VAULT TIME</span>
        <span className="cv-clock-tz">{tz}</span>
      </div>
      <div className="cv-clock-face">
        <span className="cv-clock-seg">{hh}</span>
        <span className="cv-clock-colon">:</span>
        <span className="cv-clock-seg">{mm}</span>
        <span className="cv-clock-colon">:</span>
        <span className="cv-clock-seg cv-clock-seg--sec">{ss}</span>
      </div>
      <div className="cv-clock-bottom">
        <span className="cv-clock-date">{date}</span>
        <span className="cv-clock-status">
          <span className="cv-clock-dot" />
          SYNC
        </span>
      </div>
    </div>
  );
};

/* ── Info Strip — mobile-only fill widgets ── */
const InfoStrip = ({ visible }) => (
  <div className={`cv-info-strip${visible ? ' cv-info-strip--show' : ''}`}>

    {/* Live vault connection status */}
    <div className="cv-status-bar">
      <span className="cv-status-dot" />
      <span className="cv-status-label">Vault Connection</span>
      <span className="cv-status-val">SECURED</span>
    </div>

    {/* Protocol tag chips */}
    <div className="cv-tag-row">
      {TAGS.map(t => (
        <span key={t} className="cv-tag">{t}</span>
      ))}
    </div>

    {/* Animated scan metrics */}
    <div className="cv-scan-block">
      {SCAN_ROWS.map(r => (
        <div key={r.key} className="cv-scan-row">
          <span className="cv-scan-key">{r.key}</span>
          <span className="cv-scan-bar">
            <span className="cv-scan-bar-fill" style={{ '--fill': r.fill }} />
          </span>
          <span className="cv-scan-val">{r.val}</span>
        </div>
      ))}
    </div>

    {/* Hex vault ID badge */}
    <div className="cv-hex-badge">
      <span className="cv-hex-label">Vault ID</span>
      <span className="cv-hex-code">0xF3A9·C72E·4B1D</span>
      <span className="cv-hex-status">Active</span>
    </div>

    {/* Live vault clock */}
    <VaultClock />

  </div>
);

const Intro = ({ onComplete, onStartTransition, forceMotion = false }) => {
  const [loaded, setLoaded]           = useState(false);
  const [buttonReady, setButtonReady] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [hovered, setHovered]         = useState(false);
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
    completeRef.current = setTimeout(() => {
      if (onComplete) onComplete();
    }, 320);
  };

  return (
    <div className={[
      'cv-root',
      loaded       ? 'cv-loaded'      : '',
      transitioning ? 'cv-opening'    : '',
      forceMotion  ? 'cv-force-motion': ''
    ].filter(Boolean).join(' ')}>

      {/* Background layers */}
      <div className="cv-bg">
        <div className="cv-ocean" />
        <div className="cv-ocean-caustics" />
        <div className="cv-ocean-waves" />
        <div className="cv-ocean-glint" />
      </div>
      <div className="cv-veil" />

      {/* Scrolling ribbons */}
      {RIBBONS.map((r) => {
        const isVertical = r.pos === 'left' || r.pos === 'right';
        const verticalItems = isVertical
          ? Array.from({ length: 6 }, () => r.items).flat()
          : null;
        return (
          <div key={r.pos} className={`cv-ribbon cv-ribbon--${r.pos} cv-ribbon--${r.dir}`}>
            <div
              className={`cv-ribbon-track${isVertical ? ' cv-ribbon-track--v' : ''}`}
              style={{ animationDuration: `${r.dur}s` }}
            >
              {isVertical ? (
                <>
                  <div className="cv-ribbon-list">
                    {verticalItems.map((item, i) => (
                      <span key={`v1-${i}`} className="cv-ribbon-item">
                        {item}<span className="cv-ribbon-sep">&middot;</span>
                      </span>
                    ))}
                  </div>
                  <div className="cv-ribbon-list">
                    {verticalItems.map((item, i) => (
                      <span key={`v2-${i}`} className="cv-ribbon-item">
                        {item}<span className="cv-ribbon-sep">&middot;</span>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                [...r.items, ...r.items].map((item, i) => (
                  <span key={i} className="cv-ribbon-item">
                    {item}<span className="cv-ribbon-sep">&middot;</span>
                  </span>
                ))
              )}
            </div>
          </div>
        );
      })}

      {/* Main stage */}
      <main className="cv-stage">

        {/* Three-column scene: cards + cube */}
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

        {/* Cyber Vault title */}
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

        {/* ── Info strip: fills blank space on mobile ── */}
        <InfoStrip visible={loaded} />

        {/* Spacer pushes button toward bottom on mobile */}
        <div className="cv-stage-spacer" />

        {/* CTA button — inside stage so it flows after info strip on mobile */}
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

      </main>

    </div>
  );
};

export default Intro;