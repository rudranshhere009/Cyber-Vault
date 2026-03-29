import React, { useEffect, useRef, useState } from 'react';
import CyberVaultIntro from './CyberVaultIntro';
import './Welcome.css';

function HexCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId, t = 0;
    const isMobile = window.innerWidth < 600;
    const HEX_SIZE = isMobile ? 20 : 30;
    const HEX_GAP  = 2;
    const W = HEX_SIZE * 2 + HEX_GAP;
    const H = Math.sqrt(3) * HEX_SIZE + HEX_GAP;
    function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    const PULSE_COUNT = isMobile ? 3 : 6;
    let pulses = [];
    function respawnPulse(i) {
      const cols = Math.ceil(canvas.width / (W * 0.75)) + 2;
      const rows = Math.ceil(canvas.height / H) + 2;
      pulses[i] = { col: Math.floor(Math.random() * cols), row: Math.floor(Math.random() * rows), phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.7 };
    }
    for (let i = 0; i < PULSE_COUNT; i++) respawnPulse(i);
    const STREAM_COUNT = isMobile ? 5 : 12;
    const DIR_ANGLES = [0,60,120,180,240,300].map(d => d * Math.PI / 180);
    let streams = [];
    function respawnStream(i) {
      const cols = Math.ceil(canvas.width / (W * 0.75)) + 2;
      const rows = Math.ceil(canvas.height / H) + 2;
      streams[i] = { col: Math.floor(Math.random()*cols), row: Math.floor(Math.random()*rows), dir: Math.floor(Math.random()*6), progress: Math.random(), speed: 0.003 + Math.random()*0.005 };
    }
    for (let i = 0; i < STREAM_COUNT; i++) respawnStream(i);
    function hexPath(cx, cy, r) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = (Math.PI/3)*i - Math.PI/6; i===0 ? ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a)) : ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a)); }
      ctx.closePath();
    }
    function draw() {
      t += 0.01; ctx.clearRect(0,0,canvas.width,canvas.height);
      const cols = Math.ceil(canvas.width/(W*0.75))+3, rows = Math.ceil(canvas.height/H)+3;
      const ox = (canvas.width - cols*W*0.75)/2, oy = (canvas.height - rows*H)/2;
      const maxD = Math.sqrt(canvas.width*canvas.width+canvas.height*canvas.height)*0.5;
      for (let col = -1; col < cols; col++) {
        for (let row = -1; row < rows; row++) {
          const cx = ox+col*W*0.75, cy = oy+row*H+(col%2===0?0:H*0.5);
          const dx=cx-canvas.width*0.5, dy=cy-canvas.height*0.5;
          const dist=Math.sqrt(dx*dx+dy*dy);
          const prox=1-Math.min(dist/maxD,1);
          let pb=0;
          for (const p of pulses) {
            const px=ox+p.col*W*0.75, py=oy+p.row*H+(p.col%2===0?0:H*0.5);
            const pd=Math.sqrt((cx-px)**2+(cy-py)**2);
            const wave=Math.sin(t*p.speed-pd*0.042+p.phase);
            pb=Math.max(pb,Math.max(0,wave)*Math.max(0,1-pd/220));
          }
          hexPath(cx,cy,HEX_SIZE-1.5);
          ctx.fillStyle=`rgba(160,75,8,${(0.02+prox*0.04+pb*0.14)*0.5})`; ctx.fill();
          ctx.strokeStyle=`rgba(255,${130+pb*80},${15+pb*35},${0.05+prox*0.09+pb*0.5})`; ctx.lineWidth=0.6+pb*0.8; ctx.stroke();
          if (pb>0.5) { ctx.beginPath(); ctx.arc(cx,cy,1.5+pb*2,0,Math.PI*2); ctx.fillStyle=`rgba(255,${150+pb*100},50,${pb*0.85})`; ctx.fill(); }
        }
      }
      for (let i=0;i<streams.length;i++) {
        const s=streams[i]; s.progress+=s.speed;
        if (s.progress>=1){respawnStream(i);continue;}
        const sx=ox+s.col*W*0.75, sy=oy+s.row*H+(s.col%2===0?0:H*0.5);
        const ex=sx+Math.cos(DIR_ANGLES[s.dir])*W*0.75, ey=sy+Math.sin(DIR_ANGLES[s.dir])*H;
        const lx=sx+(ex-sx)*s.progress, ly=sy+(ey-sy)*s.progress;
        const grad=ctx.createLinearGradient(sx,sy,lx,ly);
        grad.addColorStop(0,'rgba(255,140,30,0)'); grad.addColorStop(0.5,'rgba(255,160,50,0.12)'); grad.addColorStop(1,'rgba(255,200,80,0.55)');
        ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(lx,ly); ctx.strokeStyle=grad; ctx.lineWidth=1.2; ctx.stroke();
        ctx.beginPath(); ctx.arc(lx,ly,2.2,0,Math.PI*2); ctx.fillStyle='rgba(255,185,65,0.9)'; ctx.fill();
      }
      animId=requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(animId); ro.disconnect(); };
  }, []);
  return <canvas ref={ref} className="wc-hex-canvas" aria-hidden="true" />;
}

function useTypewriter(words, typeSpeed=42, deleteSpeed=22, pauseMs=1600) {
  const [display, setDisplay] = useState('');
  const wi       = useRef(0);
  const pos      = useRef(0);
  const deleting = useRef(false);

  useEffect(() => {
    let timerId;

    function step() {
      const word = words[wi.current % words.length];

      if (!deleting.current) {
        // type one char
        pos.current = Math.min(pos.current + 1, word.length);
        setDisplay(word.slice(0, pos.current));

        if (pos.current === word.length) {
          // finished typing — pause then start deleting
          deleting.current = true;
          timerId = setTimeout(step, pauseMs);
        } else {
          timerId = setTimeout(step, typeSpeed);
        }
      } else {
        // delete one char
        pos.current = Math.max(pos.current - 1, 0);
        setDisplay(word.slice(0, pos.current));

        if (pos.current === 0) {
          // finished deleting — move to next word
          deleting.current = false;
          wi.current++;
          timerId = setTimeout(step, typeSpeed + 80); // tiny pause before next word
        } else {
          timerId = setTimeout(step, deleteSpeed);
        }
      }
    }

    // Kick off immediately — first char appears after typeSpeed ms
    timerId = setTimeout(step, 300); // small initial delay so page loads first
    return () => clearTimeout(timerId);
  }, []); // runs once on mount — refs hold all mutable state

  return display;
}

/* ── Security Pipeline (replaces Vault Stats) ── */
const PIPELINE_STEPS = [
  { id:'upload',   icon:'⬆', label:'Upload',    desc:'File received',        color:'#ff9a40' },
  { id:'scan',     icon:'⊙', label:'Scan',      desc:'Threat analysis',      color:'#ffb840' },
  { id:'encrypt',  icon:'⬡', label:'Encrypt',   desc:'AES-256-GCM',          color:'#ff7a20' },
  { id:'sign',     icon:'◈', label:'Sign',       desc:'Key fingerprint',      color:'#7ab8ff' },
  { id:'vault',    icon:'◉', label:'Vault',      desc:'Stored securely',      color:'#5cdf8a' },
];

function SecurityPipeline() {
  const [active, setActive] = useState(0);
  const [done, setDone]     = useState([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    // Cycle: step activates, runs, completes, next begins
    let step = 0;
    setDone([]); setActive(0); setRunning(true);

    const advance = () => {
      setActive(step);
      setRunning(true);
      setTimeout(() => {
        setDone(d => [...d, step]);
        setRunning(false);
        step++;
        if (step < PIPELINE_STEPS.length) {
          setTimeout(advance, 320);
        } else {
          // reset after pause
          setTimeout(() => { step = 0; setDone([]); setActive(0); setRunning(true); setTimeout(advance, 400); }, 2200);
        }
      }, 900);
    };
    const init = setTimeout(advance, 500);
    return () => clearTimeout(init);
  }, []);

  return (
    <div className="wc-pipeline">
      <div className="wc-pipeline-header">
        <span className="wc-pipeline-dot"/>
        SECURITY PIPELINE
        <span className="wc-pipeline-status">{running ? 'PROCESSING' : 'IDLE'}</span>
      </div>
      <div className="wc-pipeline-track">
        {PIPELINE_STEPS.map((step, i) => {
          const isDone   = done.includes(i);
          const isActive = active === i && running;
          const isPend   = !isDone && !isActive;
          return (
            <React.Fragment key={step.id}>
              <div className={`wc-pipe-step${isDone?' wc-pipe-step--done':isActive?' wc-pipe-step--active':' wc-pipe-step--pending'}`}>
                <div className="wc-pipe-icon" style={isDone?{borderColor:step.color,color:step.color,boxShadow:`0 0 12px ${step.color}55`}:isActive?{borderColor:step.color,color:step.color,boxShadow:`0 0 18px ${step.color}88`}:{}}>
                  {isDone
                    ? <svg viewBox="0 0 14 14" fill="none" width="12" height="12"><path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    : <span>{step.icon}</span>
                  }
                  {isActive && <span className="wc-pipe-spinner"/>}
                </div>
                <div className="wc-pipe-label">{step.label}</div>
                <div className="wc-pipe-desc" style={isDone?{color:step.color}:isActive?{color:'rgba(255,210,160,0.7)'}:{}}>{step.desc}</div>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className={`wc-pipe-connector${isDone?' wc-pipe-connector--done':''}`}>
                  <div className="wc-pipe-connector-fill" style={isDone?{background:step.color,width:'100%'}:{}}/>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function EncryptBar() {
  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState('enc');
  useEffect(() => {
    let p=0;
    const tick=setInterval(()=>{
      p+=1.4+Math.random()*1.8;
      if(p>=100){setPct(100);setPhase('done');clearInterval(tick);setTimeout(()=>{setPct(0);setPhase('enc');},1800);}
      else setPct(Math.round(p));
    },60);
    return ()=>clearInterval(tick);
  },[phase==='enc'?0:1]);
  return (
    <div className="wc-encbar">
      <div>
        <div className="wc-encbar-top">
          <span className="wc-encbar-label">{phase==='done'?'✓ AES-256 SECURED':'ENCRYPTING PAYLOAD'}</span>
          <span className="wc-encbar-pct">{pct}%</span>
        </div>
        <div className="wc-encbar-track" style={{marginTop:6}}>
          <div className="wc-encbar-fill" style={{width:`${pct}%`,background:phase==='done'?'linear-gradient(90deg,#3fc87a,#5cdf8a)':'linear-gradient(90deg,#c07010,#ffb040,#ff8030)'}}/>
        </div>
      </div>
      <div className="wc-encbar-chars">
        {Array.from({length:28}).map((_,i)=>(
          <span key={i} className="wc-encbar-char" style={{opacity:pct/100>i/28?0.85:0.1,transition:'opacity 0.12s'}}>
            {String.fromCharCode(0x2588-(i%4))}
          </span>
        ))}
      </div>
      <div className="wc-encbar-meta">
        <div className="wc-encbar-meta-row">
          <span className="wc-encbar-meta-key">ALGORITHM</span>
          <span className="wc-encbar-meta-val">AES-256-GCM</span>
        </div>
        <div className="wc-encbar-meta-row">
          <span className="wc-encbar-meta-key">KEY SIZE</span>
          <span className="wc-encbar-meta-val">256 BIT</span>
        </div>
        <div className="wc-encbar-meta-row">
          <span className="wc-encbar-meta-key">MODE</span>
          <span className="wc-encbar-meta-val" style={{color: phase==='done'?'#5cdf8a':'#ff9a40'}}>{phase==='done'?'SECURED':'ACTIVE'}</span>
        </div>
        <div className="wc-encbar-meta-row">
          <span className="wc-encbar-meta-key">BLOCK SIZE</span>
          <span className="wc-encbar-meta-val">128 BIT</span>
        </div>
      </div>
    </div>
  );
}

function BiometricRing() {
  const [mode,setMode]=useState(0);
  const modes=[{label:'FACE ID',icon:'◉',color:'#ff9a40',score:98.4},{label:'IRIS SCAN',icon:'◎',color:'#7ab8ff',score:96.1},{label:'FINGERPRINT',icon:'⊕',color:'#5cdf8a',score:99.2}];
  useEffect(()=>{const id=setInterval(()=>setMode(m=>(m+1)%3),3000);return()=>clearInterval(id);},[]);
  const m=modes[mode]; const circ=2*Math.PI*36;
  return (
    <div className="wc-bioring">
      <svg className="wc-bioring-svg" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,140,40,0.10)" strokeWidth="5"/>
        <circle cx="44" cy="44" r="36" fill="none" stroke={m.color} strokeWidth="4.5"
          strokeDasharray={`${(m.score/100)*circ} ${circ}`} strokeLinecap="round"
          strokeDashoffset={circ*0.25}
          style={{transition:'stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1),stroke 0.5s ease',filter:`drop-shadow(0 0 6px ${m.color}88)`}}/>
        <text x="44" y="40" textAnchor="middle" fontSize="18" fill={m.color} fontFamily="monospace">{m.icon}</text>
        <text x="44" y="54" textAnchor="middle" fontSize="8.5" fill="rgba(255,210,160,0.7)" fontFamily="monospace">{m.score}%</text>
      </svg>
      <div className="wc-bioring-label" style={{color:m.color}}>{m.label}</div>
      <div className="wc-bioring-dots">
        {modes.map((_,i)=><span key={i} className={`wc-bioring-dot${mode===i?' active':''}`} style={mode===i?{background:m.color}:{}}/>)}
      </div>
    </div>
  );
}

function Welcome({ onLogin, onSignup, onDemo, onContinue }) {
  const [mounted, setMounted] = useState(false);
  const typeText = useTypewriter(['Zero-trust encryption.','Orange-line precision.','Black-box security.','Biometric-grade access.']);
  useEffect(()=>{setTimeout(()=>setMounted(true),60);},[]);
  const highlights=['Zero-trust encryption pipeline','Biometric and password access layers','Enterprise-grade threat visibility','Fast local-first secure workflows'];
  const capabilityCards=[
    {label:'Vault Core',     title:'Encryption at every stage',       text:'Files protected during import, storage, and retrieval using hardened AES-256 flows.'},
    {label:'Identity Layer', title:'Multiple trusted sign-in paths',  text:'Password, face, iris, and fingerprint options based on your security policy.'},
    {label:'Ops View',       title:'Audit-focused Tracking',  text:'Review patterns, validate events, and monitor account confidence from one place.'},
  ];
  const handleLogin  = ()=>{if(onLogin){onLogin();return;}if(onContinue)onContinue();};
  const handleSignup = ()=>{if(onSignup){onSignup();return;}if(onContinue)onContinue();};
  const handleDemo   = ()=>{if(onDemo){onDemo();return;}if(onContinue)onContinue();};

  return (
    <div className={`welcome-root${mounted?' welcome-root--in':''}`}>
      <HexCanvas/>
      <div className="orange-glow glow-a" aria-hidden="true"/>
      <div className="orange-glow glow-b" aria-hidden="true"/>
      <div className="scan-overlay"       aria-hidden="true"/>
      <div className="wc-vignette"        aria-hidden="true"/>

      <main className="welcome-layout">
        <section className="showcase">
          <div className="eyebrow wc-reveal wc-reveal--1">
            <span className="eyebrow-dot"/>CyberVault Security Suite
          </div>

          <h1 className="wc-reveal wc-reveal--2">
            Black-box security.
            <span className="wc-typewriter">{typeText}<span className="wc-cursor"/></span>
          </h1>

          <p className="wc-reveal wc-reveal--3">
            A command-style secure workspace for teams that need professional security posture, strong identity controls, and clean high-contrast design.
          </p>

          <div className="highlight-list wc-reveal wc-reveal--4">
            {highlights.map((item,i)=>(
              <div className="highlight-item" key={item} style={{animationDelay:`${0.55+i*0.1}s`}}>
                <span className="highlight-dot"/><span>{item}</span>
              </div>
            ))}
          </div>

          <div className="wc-vault-stats-wrap wc-reveal wc-reveal--5">
            <SecurityPipeline/>
          </div>

          <div className="capability-grid wc-reveal wc-reveal--6">
            {capabilityCards.map((card,i)=>(
              <article className={`capability-card capability-card--${i}`} key={card.title} style={{'--card-delay':`${i*0.12}s`}}>
                <div className="cap-label">{card.label}</div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="access-panel wc-reveal wc-reveal--2">
          <div className="wc-corner wc-corner--tl"/><div className="wc-corner wc-corner--tr"/>
          <div className="wc-corner wc-corner--bl"/><div className="wc-corner wc-corner--br"/>

          <div className="access-top">
            <div className="access-kicker"><span className="pulse"/>Access Gateway</div>
            <h2>Enter CyberVault</h2>
            <p>Choose your route to continue into the secure workspace.</p>
          </div>

          <div className="access-actions">
            <button className="access-btn primary wc-btn-fx" onClick={handleLogin}>
              <span className="wc-btn-icon">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><rect x="2" y="7" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </span>Log In
            </button>
            <button className="access-btn secondary wc-btn-fx" onClick={handleSignup}>
              <span className="wc-btn-icon">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M12 3v4M10 5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </span>Sign Up
            </button>
          </div>

          <div className="wc-panel-widgets">
            <EncryptBar/>
            <BiometricRing/>
          </div>

          <div className="wc-status-bar">
            <div className="wc-status-item">
              <svg viewBox="0 0 14 14" fill="none" width="11" height="11"><path d="M7 1L1.5 3.5v4C1.5 10.74 4.02 13.5 7 14c2.98-.5 5.5-3.26 5.5-6.5v-4L7 1Z" stroke="#5cdf8a" strokeWidth="1.3" strokeLinejoin="round"/></svg>
              <span>256-BIT AES</span>
            </div>
            <div className="wc-status-item">
              <svg viewBox="0 0 14 14" fill="none" width="11" height="11"><circle cx="7" cy="5.5" r="2.5" stroke="#ff9a40" strokeWidth="1.3"/><path d="M1.5 13c0-3.04 2.46-5.5 5.5-5.5s5.5 2.46 5.5 5.5" stroke="#ff9a40" strokeWidth="1.3" strokeLinecap="round"/></svg>
              <span>3-MODE BIOMETRIC</span>
            </div>
            <div className="wc-status-item">
              <svg viewBox="0 0 14 14" fill="none" width="11" height="11"><circle cx="7" cy="7" r="5.5" stroke="#7ab8ff" strokeWidth="1.3"/><path d="M7 4v3.5l2 1.5" stroke="#7ab8ff" strokeWidth="1.3" strokeLinecap="round"/></svg>
              <span>99.9% UPTIME</span>
            </div>
          </div>

          <div className="demo-panel">
            <div className="wc-demo-header">
              <div className="demo-title"><span className="wc-demo-badge-dot"/>Demo Mode</div>
              <span className="wc-demo-tag">NO ACCOUNT NEEDED</span>
            </div>
            <p className="demo-copy">Explore the complete CyberVault experience — encryption, biometrics, threat detection and more — in a guided sandboxed session. Zero signup required.</p>
            <ul className="demo-list">
              <li>No login required to enter the vault workspace</li>
              <li>Upload limited to one file in demo mode</li>
              <li>Use for preview, onboarding, and training</li>
            </ul>
            <button className="access-btn secondary demo-btn wc-btn-fx" onClick={handleDemo}>
              <span className="wc-btn-icon">
                <svg viewBox="0 0 16 16" fill="none" width="13" height="13"><polygon points="4,2 14,8 4,14" fill="currentColor" opacity="0.85"/></svg>
              </span>Try Demo Mode
            </button>
          </div>

          <div className="status-strip">
            <span className="pulse"/>
            <span>Security systems nominal</span>
            <span className="wc-status-sep">·</span>
            <span className="wc-status-time" id="wc-time"/>
          </div>
        </section>
      </main>

      <div className="brand-license" aria-label="Application name and license">
        <span className="brand-license-name">CyberVault</span>
        <span className="brand-license-sep">|</span>
        <span className="brand-license-text">Licensed Software • All Rights Reserved</span>
      </div>
    </div>
  );
}

function LiveClock() {
  useEffect(()=>{
    const el=document.getElementById('wc-time'); if(!el) return;
    const tick=()=>{el.textContent=new Date().toLocaleTimeString();}; tick();
    const id=setInterval(tick,1000); return()=>clearInterval(id);
  },[]);
  return null;
}

/* ── Matrix Rain Canvas (shared) ── */
function MatrixRain({ opacity = 0.5 }) {
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
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      cols   = Math.floor(canvas.width / FS);
      drops  = Array.from({ length: cols }, () => Math.random() * -(canvas.height / FS));
      bright = new Set(Array.from({ length: Math.max(1, Math.floor(cols * 0.1)) }, () => Math.floor(Math.random() * cols)));
    }
    const ro = new ResizeObserver(init);
    ro.observe(canvas);
    init();

    let frame = 0;
    function draw() {
      animId = requestAnimationFrame(draw);
      if (++frame % 2 !== 0) return;
      ctx.fillStyle = 'rgba(3,2,1,0.16)';
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
  return <canvas ref={ref} className="wc-matrix-canvas" style={{ opacity }} aria-hidden="true" />;
}

/* ── Rubik's Cube 3D (pure CSS/DOM) ── */
function RubiksCube() {
  const FACE_COLORS = {
    top:    ['#ff6a00','#ffb040','#ff8820', '#ff6a00','#ffb040','#ff8820', '#ff6a00','#ffb040','#ff8820'],
    bottom: ['#1a9e4a','#22cc5e','#14803c', '#1a9e4a','#22cc5e','#14803c', '#1a9e4a','#22cc5e','#14803c'],
    front:  ['#cc2200','#ff3a1a','#e02810', '#cc2200','#ff3a1a','#e02810', '#cc2200','#ff3a1a','#e02810'],
    back:   ['#e08000','#ffa020','#c86000', '#e08000','#ffa020','#c86000', '#e08000','#ffa020','#c86000'],
    left:   ['#1a55cc','#2e6ef5','#1440a8', '#1a55cc','#2e6ef5','#1440a8', '#1a55cc','#2e6ef5','#1440a8'],
    right:  ['#d4c000','#ffe020','#b8a800', '#d4c000','#ffe020','#b8a800', '#d4c000','#ffe020','#b8a800'],
  };

  const faceStyle = (transform) => ({
    position: 'absolute', width: '90px', height: '90px',
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(3, 1fr)', gap: '3px', padding: '3px',
    background: '#111', borderRadius: '4px',
    transform,
  });

  const renderFace = (name, transform) => (
    <div style={faceStyle(transform)} key={name}>
      {FACE_COLORS[name].map((c, i) => (
        <div key={i} style={{
          background: c,
          borderRadius: '2px',
          boxShadow: `inset 0 0 6px rgba(0,0,0,0.45), 0 0 4px ${c}66`,
        }}/>
      ))}
    </div>
  );

  return (
    <div className="hwg-rubik-scene">
      <div className="hwg-rubik-cube">
        {renderFace('front',  'rotateY(0deg)   translateZ(45px)')}
        {renderFace('back',   'rotateY(180deg) translateZ(45px)')}
        {renderFace('left',   'rotateY(-90deg) translateZ(45px)')}
        {renderFace('right',  'rotateY(90deg)  translateZ(45px)')}
        {renderFace('top',    'rotateX(90deg)  translateZ(45px)')}
        {renderFace('bottom', 'rotateX(-90deg) translateZ(45px)')}
      </div>
    </div>
  );
}

/* ── Here We Go Popup ── */
function HereWeGoPopup({ onDone }) {
  const [phase, setPhase] = useState('in');
  const [count, setCount] = useState(7);

  useEffect(() => {
    const id = setInterval(() => setCount(c => c - 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('out'), 6600);
    const t2 = setTimeout(() => onDone(), 7100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`hwg-overlay hwg-overlay--${phase}`}>
      <div className="hwg-backdrop" />
      <div className={`hwg-card hwg-card--${phase}`}>
        <div className="hwg-inner">
          <RubiksCube />
          <div className="hwg-pop">SECURE ENTRY</div>
          <div className="hwg-label">HERE WE GO</div>
          <div className="hwg-bar-wrap">
            <div className="hwg-bar-fill" style={{ animationDuration: '7s' }} />
          </div>
          <div className="hwg-count">{count > 0 ? count : 0} seconds</div>
        </div>
      </div>
    </div>
  );
}

function WelcomeWithClock(props) { return <><Welcome {...props}/><LiveClock/></>; }

function WelcomeEntry({ initialStage = 'intro', ...props }) {
  const [stage, setStage] = useState(initialStage);
  if (stage === 'intro')
    return <CyberVaultIntro onComplete={() => setStage('popup')} forceMotion />;
  if (stage === 'popup')
    return <HereWeGoPopup onDone={() => setStage('welcome')} />;
  return <WelcomeWithClock {...props} />;
}

export default React.memo(WelcomeEntry);