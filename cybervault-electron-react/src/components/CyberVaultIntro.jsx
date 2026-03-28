import React, { useEffect, useRef, useState } from 'react';
import './CyberVaultIntro.css';

/* ── Falling matrix rain ── */
function MatrixRain() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';
    const FS = 13;
    let cols, drops, bright;
    function init() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      cols  = Math.floor(canvas.width / FS);
      drops = Array.from({ length: cols }, () => Math.random() * -(canvas.height / FS));
      bright = new Set(Array.from({ length: Math.max(1, Math.floor(cols * 0.1)) }, () => Math.floor(Math.random() * cols)));
    }
    const ro = new ResizeObserver(init); ro.observe(canvas); init();
    let frame = 0;
    function draw() {
      animId = requestAnimationFrame(draw);
      if (++frame % 2 !== 0) return;
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${FS}px "Share Tech Mono",monospace`;
      for (let i = 0; i < cols; i++) {
        const y = drops[i] * FS;
        const ch = CHARS[Math.floor(Math.random() * CHARS.length)];
        if (bright.has(i)) {
          ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(255,140,30,0.85)';
          ctx.fillStyle = 'rgba(255,210,140,0.96)';
        } else {
          ctx.shadowBlur = 0;
          ctx.fillStyle = `rgba(190,95,12,${0.22 + Math.random() * 0.18})`;
        }
        ctx.fillText(ch, i * FS, y);
        ctx.shadowBlur = 0;
        drops[i] += 0.48 + Math.random() * 0.38;
        if (drops[i] * FS > canvas.height && Math.random() > 0.974) {
          drops[i] = Math.random() * -18;
          Math.random() > 0.5 ? bright.add(i) : bright.delete(i);
        }
      }
    }
    draw();
    return () => { cancelAnimationFrame(animId); ro.disconnect(); };
  }, []);
  return <canvas ref={ref} className="cv-matrix-rain" aria-hidden="true" />;
}

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

const MATRIX_STREAMS = [
  { id: 'm1',  x: '4%',  dur: '17s', delay: '-6s',  alpha: 0.6, text: `ZERO-TRUST\nAES-256\nBIO LOCK\nP2P RELAY\nAUDIT GRID\nDEAD DROP\nTHREAT\nVAULT` },
  { id: 'm2',  x: '11%', dur: '21s', delay: '-11s', alpha: 0.5, text: `SIGN\nENCRYPT\nSCAN\nVERIFY\nHARDEN\nTRACE\nLOCKDOWN` },
  { id: 'm3',  x: '19%', dur: '19s', delay: '-9s',  alpha: 0.55, text: `COLD STORAGE\nKEY ROTATION\nSTEALTH\nAUDIT GRID\nBIOMETRIC` },
  { id: 'm4',  x: '27%', dur: '23s', delay: '-14s', alpha: 0.45, text: `VAULT SHARD\nZERO-TRUST\nAES-256\nDEAD DROP\nP2P RELAY` },
  { id: 'm5',  x: '35%', dur: '20s', delay: '-7s',  alpha: 0.55, text: `LOCK\nSCAN\nSIGN\nSTORE\nAUDIT\nMONITOR` },
  { id: 'm6',  x: '43%', dur: '22s', delay: '-10s', alpha: 0.5, text: `THREAT GRID\nBIO LOCK\nCOLD MODE\nKEY ROTATION\nSTEALTH` },
  { id: 'm7',  x: '52%', dur: '18s', delay: '-5s',  alpha: 0.6, text: `P2P RELAY\nAUDIT GRID\nZERO-TRUST\nAES-256\nVAULT` },
  { id: 'm8',  x: '60%', dur: '24s', delay: '-16s', alpha: 0.45, text: `DEAD DROP\nTHREAT\nSIGN\nENCRYPT\nVERIFY\nHARDEN` },
  { id: 'm9',  x: '68%', dur: '19s', delay: '-8s',  alpha: 0.55, text: `ZERO-TRUST\nBIO LOCK\nAES-256\nAUDIT GRID\nDEAD DROP` },
  { id: 'm10', x: '76%', dur: '22s', delay: '-12s', alpha: 0.5, text: `VAULT\nTRACE\nSIGN\nSCAN\nVERIFY\nLOCKDOWN` },
  { id: 'm11', x: '84%', dur: '20s', delay: '-6s',  alpha: 0.55, text: `STEALTH\nCOLD MODE\nKEY ROTATION\nTHREAT\nAUDIT` },
  { id: 'm12', x: '92%', dur: '25s', delay: '-18s', alpha: 0.45, text: `P2P RELAY\nENCRYPT\nSTORE\nVERIFY\nHARDEN` }
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
    completeRef.current = setTimeout(() => {
      if (onComplete) onComplete();
    }, 320);
  };

  return (
    <div className={`cv-root ${loaded ? 'cv-loaded' : ''} ${transitioning ? 'cv-opening' : ''} ${forceMotion ? 'cv-force-motion' : ''}`}>
      <div className="cv-bg">
        <div className="cv-cyber-grid" />
        <div className="cv-cyber-circuit" />
        <div className="cv-cyber-scanlines" />
        <div className="cv-cyber-sweep" />
        <div className="cv-cyber-glitch" />
      </div>
      <div className="cv-veil" />

      {RIBBONS.map((r) => {
        const isVertical = r.pos === 'left' || r.pos === 'right';
        const verticalItems = isVertical ? Array.from({ length: 6 }, () => r.items).flat() : null;
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
                        {item}
                        <span className="cv-ribbon-sep">&middot;</span>
                      </span>
                    ))}
                  </div>
                  <div className="cv-ribbon-list">
                    {verticalItems.map((item, i) => (
                      <span key={`v2-${i}`} className="cv-ribbon-item">
                        {item}
                        <span className="cv-ribbon-sep">&middot;</span>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                [...r.items, ...r.items].map((item, i) => (
                  <span key={i} className="cv-ribbon-item">
                    {item}
                    <span className="cv-ribbon-sep">&middot;</span>
                  </span>
                ))
              )}
            </div>
          </div>
        );
      })}

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
