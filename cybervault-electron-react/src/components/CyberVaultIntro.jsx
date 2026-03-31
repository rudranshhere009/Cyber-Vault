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

const FAQ_ITEMS = [
  {
    id: 'local',
    icon: '◎',
    tag: 'ZERO CLOUD',
    q: 'Does my data ever leave my device?',
    a: 'Never. CyberVault is fully local-first — no servers, no sync windows, no cloud exposure. Your vault lives entirely on your hardware and nowhere else.',
  },
  {
    id: 'bio',
    icon: '◈',
    tag: 'UNPHISHABLE',
    q: 'What if I forget my master password?',
    a: "There is no master password to forget. Access is bound to your biometric hardware — Face ID or fingerprint — fused directly to your chip. Nothing to phish, nothing to leak.",
  },
  {
    id: 'cipher',
    icon: '◆',
    tag: 'FIELD-PROVEN',
    q: 'How is my vault encrypted?',
    a: 'Every single entry is individually encrypted with AES-256 at rest. Even with full physical device access, the vault stays sealed. Folder-level encryption is not enough — we go per-record.',
  },
  {
    id: 'mesh',
    icon: '⬡',
    tag: 'SERVERLESS',
    q: 'How does sync work without a cloud server?',
    a: 'CyberVault syncs device-to-device over an encrypted P2P mesh relay. No central broker, no traffic logs, no single point of failure — your devices talk directly to each other.',
  },
  {
    id: 'audit',
    icon: '▦',
    tag: 'FULL TRACE',
    q: 'Can I see who accessed my vault and when?',
    a: 'Yes. The Audit Grid keeps a tamper-evident log of every read, write, and auth attempt. You know exactly who touched what and when — full trace, always.',
  },
  {
    id: 'drop',
    icon: '◉',
    tag: 'BLIND RELAY',
    q: 'How do I share files without exposing them?',
    a: 'Dead Drop Transit creates one-time encrypted channels for credential and file handoffs. The relay never sees the payload — zero-knowledge by design, not by promise.',
  },
];

/* ── FAQ Accordion ── */
const WhyCyberVault = ({ visible }) => {
  const [openId, setOpenId] = useState(null);
  const toggle = (id) => setOpenId(prev => prev === id ? null : id);

  return (
    <section className={`wcv-section${visible ? ' wcv-section--show' : ''}`}>

      {/* Divider */}
      <div className="wcv-divider">
        <span className="wcv-div-line" />
        <span className="wcv-div-diamond">◆</span>
        <span className="wcv-div-line" />
      </div>

      {/* Header */}
      <div className="wcv-header">
        <span className="wcv-eyebrow">VAULT INTELLIGENCE — FAQ</span>
        <h2 className="wcv-title">
          <span className="wcv-title-why">Why</span>
          {' '}
          <span className="wcv-title-cv">Cyber Vault</span>
        </h2>
        <p className="wcv-subtitle">
          Every question answered. No marketing fluff.
        </p>
      </div>

      {/* FAQ list */}
      <div className="wcv-faq">
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = openId === item.id;
          return (
            <div
              key={item.id}
              className={`wcv-faq-item${isOpen ? ' wcv-faq-item--open' : ''}`}
              style={{ '--wci': i }}
              onClick={() => toggle(item.id)}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && toggle(item.id)}
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
            >
              {/* Question row */}
              <div className="wcv-faq-head">
                <span className="wcv-faq-icon">{item.icon}</span>
                <span className="wcv-faq-q">{item.q}</span>
                <span className="wcv-faq-tag">{item.tag}</span>
                <span className="wcv-faq-chevron" aria-hidden="true">▼</span>
              </div>

              {/* Answer — expands */}
              <div className="wcv-faq-body">
                <p className="wcv-faq-a">{item.a}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Verdict */}
      <div className="wcv-verdict">
        <span className="wcv-verdict-line" />
        <span className="wcv-verdict-text">VAULT SUPERIORITY: CONFIRMED</span>
        <span className="wcv-verdict-line" />
      </div>

    </section>
  );
};

const DESKTOP_METRICS = [
  { label: 'Vault Mesh', value: 'LOCAL', tone: 'mint' },
  { label: 'Cipher State', value: 'AES-256', tone: 'amber' },
  { label: 'Threat Trace', value: 'LOW', tone: 'soft' }
];


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

/* ── ThreatPulse — ultra-thin signal widget ── */
const ThreatPulse = () => {
  const [bars, setBars] = useState(() => Array.from({ length: 16 }, () => Math.random()));
  const [threat, setThreat] = useState('LOW');
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setBars(Array.from({ length: 16 }, () => Math.random()));
      setSeed(s => s + 1);
    }, 800);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const levels = ['LOW', 'LOW', 'LOW', 'TRACE', 'LOW', 'NOMINAL'];
    setThreat(levels[seed % levels.length]);
  }, [seed]);

  const color = threat === 'TRACE' ? '#ffdd55' : threat === 'NOMINAL' ? '#4fffb0' : '#ff7a30';

  return (
    <div className="cv-threatpulse">
      <div className="cv-tp-bars">
        {bars.map((h, i) => (
          <span
            key={i}
            className="cv-tp-bar"
            style={{
              height: `${8 + h * 14}px`,
              background: color,
              opacity: 0.3 + h * 0.7,
            }}
          />
        ))}
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


    {/* Threat pulse — thin widget */}
    <ThreatPulse />

    {/* Live vault clock */}
    <VaultClock />

  </div>
);

const DesktopStrip = ({ visible }) => (
  <div className={`cv-desktop-strip${visible ? ' cv-desktop-strip--show' : ''}`}>
    <div className="cv-desktop-card cv-desktop-card--status">
      <div className="cv-desktop-card-top">
        <span className="cv-desktop-kicker">Vault Connection</span>
        <span className="cv-desktop-live">SECURED</span>
      </div>
      <div className="cv-desktop-metrics">
        {DESKTOP_METRICS.map((metric) => (
          <div key={metric.label} className={`cv-desktop-metric cv-desktop-metric--${metric.tone}`}>
            <span className="cv-desktop-metric-label">{metric.label}</span>
            <span className="cv-desktop-metric-value">{metric.value}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="cv-desktop-card cv-desktop-card--pulse">
      <div className="cv-desktop-card-top">
        <span className="cv-desktop-kicker">Signal Pulse</span>
        <span className="cv-desktop-subline">Telemetry</span>
      </div>
      <ThreatPulse />
    </div>

    <div className="cv-desktop-card cv-desktop-card--clock">
      <VaultClock />
    </div>
  </div>
);

const Intro = ({ onComplete, onStartTransition, forceMotion = false }) => {
  const [loaded, setLoaded]           = useState(false);
  const [buttonReady, setButtonReady] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [hovered, setHovered]         = useState(false);
  const [mobileStartOpen, setMobileStartOpen] = useState(false);
  const [compactViewport, setCompactViewport] = useState(false);
  const completeRef = useRef(null);
  const sideStartRef = useRef(null);

  useEffect(() => {
    const t1 = setTimeout(() => setLoaded(true), 100);
    const t2 = setTimeout(() => setButtonReady(true), 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(completeRef.current);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 720px)');
    const syncViewport = () => {
      setCompactViewport(media.matches);
      if (!media.matches) setMobileStartOpen(false);
    };

    syncViewport();
    if (media.addEventListener) {
      media.addEventListener('change', syncViewport);
      return () => media.removeEventListener('change', syncViewport);
    }

    media.addListener(syncViewport);
    return () => media.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    if (!compactViewport || !mobileStartOpen) return undefined;

    const handleOutsidePress = (event) => {
      if (!sideStartRef.current?.contains(event.target)) {
        setMobileStartOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsidePress);
    return () => document.removeEventListener('pointerdown', handleOutsidePress);
  }, [compactViewport, mobileStartOpen]);

  const handleEnter = () => {
    if (transitioning) return;
    setTransitioning(true);
    completeRef.current = setTimeout(() => {
      if (onComplete) onComplete();
    }, 720);
  };

  const handleSideStart = () => {
    if (compactViewport && !mobileStartOpen) {
      setMobileStartOpen(true);
      return;
    }
    handleEnter();
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
            {'Cyber Vault'.split('').map((ch, i) =>
              ch === ' ' ? (
                <span key={i} className="cv-gap" />
              ) : (
                <span
                  key={i}
                  className={`cv-char${ch === 'C' || ch === 'V' ? ' cv-char--tall' : ''}`}
                  style={{ '--ci': i }}
                >
                  {ch}
                </span>
              )
            )}
          </h1>
        </div>

        {/* ── Info strip: fills blank space on mobile ── */}
        <DesktopStrip visible={loaded} />
        <InfoStrip visible={loaded} />

        {/* ── Why CyberVault section ── */}
        <WhyCyberVault visible={loaded} />

        {/* Spacer pushes button toward bottom on mobile */}

        {/* CTA button — inside stage so it flows after info strip on mobile */}

      </main>

      <button
        ref={sideStartRef}
        className={`cv-side-start ${buttonReady ? 'cv-side-start--show' : ''} ${hovered ? 'cv-side-start--on' : ''} ${mobileStartOpen ? 'cv-side-start--open' : ''}`}
        onClick={handleSideStart}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={compactViewport && !mobileStartOpen ? 'Open start control' : 'Start Cyber Vault'}
      >
        {/* Animated horizontal scan line */}
        <span className="cv-side-start__scan" aria-hidden="true" />
        {/* Corner bracket ticks */}
        <span className="cv-side-start__tick cv-side-start__tick--tl" aria-hidden="true" />
        <span className="cv-side-start__tick cv-side-start__tick--br" aria-hidden="true" />

        {/* Icon: Samsung-style phone when collapsed on mobile, arrow-enter otherwise */}
        <span className="cv-side-start__icon" aria-hidden="true">
          {compactViewport && !mobileStartOpen ? (
            /* Realistic Samsung-style smartphone silhouette */
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="cv-ssi-svg">
              {/* Phone body — tall rounded rectangle like Galaxy S series */}
              <rect x="5" y="1" width="12" height="20" rx="2.8" ry="2.8"
                stroke="currentColor" strokeWidth="1.15" fill="rgba(255,154,60,0.05)"/>
              {/* Side volume buttons — left side */}
              <rect x="3.5" y="6.5" width="1.1" height="3.5" rx="0.5"
                fill="currentColor" opacity="0.45"/>
              <rect x="3.5" y="11" width="1.1" height="3.5" rx="0.5"
                fill="currentColor" opacity="0.45"/>
              {/* Power button — right side */}
              <rect x="17.4" y="8" width="1.1" height="4" rx="0.5"
                fill="currentColor" opacity="0.45"/>
              {/* Front camera pill (punch-hole style) */}
              <rect x="9.2" y="3.2" width="3.6" height="1.4" rx="0.7"
                fill="currentColor" opacity="0.35"/>
              {/* Home indicator bar (modern gesture bar) */}
              <rect x="8.5" y="18.5" width="5" height="1" rx="0.5"
                fill="currentColor" opacity="0.5"/>
              {/* Screen area — subtle inner rect */}
              <rect x="6.8" y="5.5" width="8.4" height="12" rx="1.2"
                stroke="currentColor" strokeWidth="0.6" opacity="0.22" fill="none"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="cv-ssi-svg cv-ssi-svg--enter">
              <path d="M2 8H12M12 8L8 4M12 8L8 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11.5 1.5H14.5V14.5H11.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" opacity="0.45"/>
            </svg>
          )}
        </span>

        {/* Text */}
        <span className="cv-side-start__desktop">
          <span className="cv-side-start__line">
            Let's Hop In
          </span>
        </span>
      </button>

    </div>
  );
};

export default Intro;