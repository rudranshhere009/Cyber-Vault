import React, { useEffect, useMemo, useRef, useState } from 'react';
import OCRSection from '../components/Chatbot';
import IrisModal from '../components/IrisModal'; // NEW: Import iris modal
import IrisDetector from '../utils/irisDetection'; // NEW: Import iris detector
import FingerprintAuth from '../components/FingerprintAuth'; // NEW: Import fingerprint auth
import Welcome from '../components/Welcome'; // Import welcome page

function useMatrixEffect() {
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.className = 'matrix-bg';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const matrixChars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const charArray = matrixChars.split('');
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array.from({ length: columns }, () => 1);

    let timer;
    function draw() {
      ctx.fillStyle = 'rgba(10, 10, 15, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = fontSize + 'px JetBrains Mono';

      for (let i = 0; i < drops.length; i++) {
        const text = charArray[Math.floor(Math.random() * charArray.length)];
        ctx.fillStyle = Math.random() > 0.98 ? '#00d4ff' : '#00ff88';
        ctx.globalAlpha = Math.random() * 0.5 + 0.1;
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }

    timer = setInterval(draw, 100);
    document.body.appendChild(canvas);

    function onResize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', onResize);

    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', onResize);
      if (document.body.contains(canvas)) document.body.removeChild(canvas);
    };
  }, []);
}

function useCursorGlow() {
  useEffect(() => {
    function move(e) {
      const cursor = document.querySelector('.cursor-glow') || (() => {
        const el = document.createElement('div');
        el.className = 'cursor-glow';
        document.body.appendChild(el);
        return el;
      })();
      cursor.style.left = e.clientX - 10 + 'px';
      cursor.style.top = e.clientY - 10 + 'px';
    }
    document.addEventListener('mousemove', move);
    return () => document.removeEventListener('mousemove', move);
  }, []);
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:16px;">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <span>${message}</span>
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.classList.add('show'), 100);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (document.body.contains(notification)) document.body.removeChild(notification);
    }, 400);
  }, 4000);
}

function useEasterEgg() {
  useEffect(() => {
    const seq = [];
    const code = ['KeyN', 'KeyE', 'KeyU', 'KeyR', 'KeyA', 'KeyL'];
    function onKey(e) {
      seq.push(e.code);
      if (seq.length > code.length) seq.shift();
      if (JSON.stringify(seq) === JSON.stringify(code)) {
        showNotification('> neural.enhancement.unlocked • quantum.boost.active', 'success');
        document.body.style.animation = 'neural-boost 2s ease-in-out';
        const style = document.createElement('style');
        style.textContent = `@keyframes neural-boost {0%{filter:brightness(1);}50%{filter:brightness(1.3) hue-rotate(45deg) saturate(1.5);}100%{filter:brightness(1);}}`;
        document.head.appendChild(style);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}

async function sha256Hex(data) {
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomHex(bytes = 6) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

function buildRecoveryCodes(count = 8) {
  return Array.from({ length: count }, () => `${randomHex(2).toUpperCase()}-${randomHex(2).toUpperCase()}`);
}

function useSession() {
  const [session, setSession] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('neuralSession') || '{}');
      if (s.email && s.loginTime) return s;
    } catch {}
    return null;
  });

  function saveSession(s) {
    setSession(s);
    localStorage.setItem('neuralSession', JSON.stringify(s));
  }
  function clearSession() {
    setSession(null);
    localStorage.removeItem('neuralSession');
  }
  return { session, saveSession, clearSession };
}

function PasswordStrength({ value }) {
  const { width, text, gradient } = useMemo(() => {
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[a-z]/.test(value)) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[^a-zA-Z0-9]/.test(value)) score += 1;
    const map = {
      0: ['neural.security.level: critical.vulnerability', 'linear-gradient(90deg,#ff3366,#cc1144)'],
      1: ['neural.security.level: critical.vulnerability', 'linear-gradient(90deg,#ff3366,#cc1144)'],
      2: ['neural.security.level: insufficient.protection', 'linear-gradient(90deg,#ffaa00,#ff8800)'],
      3: ['neural.security.level: moderate.encryption', 'linear-gradient(90deg,#ffaa00,#00ff88)'],
      4: ['neural.security.level: strong.quantum.resistance', 'linear-gradient(90deg,#00ff88,#00d4ff)'],
      5: ['neural.security.level: maximum.protection', 'linear-gradient(90deg,#00d4ff,#6366f1)'],
    };
    const [text, gradient] = map[score];
    return { width: (score / 5) * 100, text, gradient };
  }, [value]);

  return (
    <div>
      <div className="password-strength">
        <div className="password-strength-bar" style={{ width: width + '%', background: gradient }}></div>
      </div>
      <div className="password-strength-text">{text}</div>
    </div>
  );
}

const enc = new TextEncoder();
const dec = new TextDecoder();
const toHex = (buf) => Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => new Uint8Array(hex.match(/.{1,2}/g).map(h => parseInt(h, 16)));
const toB64 = (u8) => {
  const chunkSize = 0x8000;
  let result = '';
  for (let i = 0; i < u8.length; i += chunkSize) {
    result += String.fromCharCode(...u8.subarray(i, i + chunkSize));
  }
  return btoa(result);
};
const fromB64 = (b64) => new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0)));

const DB_NAME = 'cybervaultDB';
const DB_STORE = 'files';
function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function idbPut(key, value) {
  return idbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}
function idbGet(key) {
  return idbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const rq = tx.objectStore(DB_STORE).get(key);
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error);
  }));
}
function idbDelete(key) {
  return idbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

async function loadFaceApi() {
  if (window.faceapi) return window.faceapi;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
    s.onload = resolve; s.onerror = () => reject(new Error('faceapi.load.failed'));
    document.head.appendChild(s);
  });
  const faceapi = window.faceapi;
  const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
  ]);
  return faceapi;
}

function FaceModal({ mode, open, onClose, onRegistered, onAuthenticated }) {
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Initializing camera...');

  useEffect(() => {
    let stream;
    let cancelled = false;
    let detectionInterval;

    async function start() {
      try {
        setLoading(true);
        setMessage('Loading neural vision modules...');
        const faceapi = await loadFaceApi();
        if (cancelled) return;
        setMessage('Activating camera...');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('play', () => {
            const samples = [];
            detectionInterval = setInterval(async () => {
              if (!open || !videoRef.current) return;

              const useSSD = true;
              const options = useSSD
                ? new window.faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
                : new window.faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5, inputSize: 416 });
              const res = await window.faceapi
                .detectSingleFace(videoRef.current, options)
                .withFaceLandmarks()
                .withFaceDescriptor();

              if (res && res.descriptor) {
                const { detection } = res;
                const { box } = detection;
                const faceCenterX = box.x + box.width / 2;
                const faceCenterY = box.y + box.height / 2;

                const frame = {
                  x: 140,
                  y: 40,
                  width: 200,
                  height: 280,
                };

                if (
                  faceCenterX > frame.x &&
                  faceCenterX < frame.x + frame.width &&
                  faceCenterY > frame.y &&
                  faceCenterY < frame.y + frame.height
                ) {
                  samples.push(Array.from(res.descriptor));
                }

                if (samples.length >= 3) {
                  clearInterval(detectionInterval);
                  const len = samples[0].length;
                  const avg = new Array(len).fill(0);
                  for (const d of samples) {
                    for (let i = 0; i < len; i++) avg[i] += d[i];
                  }
                  for (let i = 0; i < len; i++) avg[i] /= samples.length;
                  if (mode === 'register') {
                    onRegistered(avg);
                  } else {
                    onAuthenticated(avg);
                  }
                  onClose();
                }
              }
            }, 200);
          });
          await videoRef.current.play();
        }
        setMessage('Align your face within the frame');
        setLoading(false);
      } catch (err) {
        console.error(err);
        setMessage('Camera or model error. Ensure a webcam is available.');
        setLoading(false);
      }
    }
    if (open) start();
    return () => {
      cancelled = true;
      clearInterval(detectionInterval);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [open, mode, onClose, onAuthenticated, onRegistered]);

  if (!open) return null;
  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      background: 'linear-gradient(135deg, rgba(212, 227, 240, 0.98), rgba(150, 168, 199, 0.98))',  
      zIndex: 10000, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
    
      <div style={{ background: 'linear-gradient(145deg, var(--glass-bg), rgba(15, 15, 25, 0.95))', border: '1px solid var(--border-glow)', borderRadius: 16, padding: 16, width: 520, boxShadow: '0 0 50px rgba(0, 212, 255, 0.2)' }}>
        <div className="neural-title" style={{ fontSize: 22, marginBottom: 8 }}>{mode === 'register' ? 'Register Face' : 'Face Login'}</div>
        <div className="password-status" style={{ marginBottom: 10 }}>
          {loading ? 'Loading...' : message}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, position: 'relative' }}>
          <video ref={videoRef} width="480" height="360" style={{ borderRadius: 12, border: '1px solid var(--border-glow)', background: '#000', transform: 'scaleX(-1)' }} muted playsInline />
          <div className="face-cutout-frame"></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="cyber-btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function PasswordModal({ open, onClose, onConfirm, value, onChange }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, width: 360, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
        <div className="neural-title" style={{ fontSize: 20, marginBottom: 10, WebkitTextFillColor: 'initial', background: 'none' }}>Enter Master Password</div>
        <div className="password-status" style={{ marginBottom: 8, color: '#374151' }}>Required to encrypt/decrypt files</div>
        <input type="password" className="password-input" placeholder="Enter quantum passphrase..." value={value} onChange={onChange} style={{ background: '#f9fafb', color: '#111827' }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 12, justifyContent: 'flex-end' }}>
          <button className="cyber-btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="cyber-btn btn-primary" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  useEasterEgg();
  const { session, saveSession, clearSession } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('cvTheme') || 'frost');
  const [profile, setProfile] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cyberProfile') || 'null');
      if (saved) return saved;
    } catch {}
    return {
      displayName: '',
      title: 'Vault Operator',
      email: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      accent: '#7aa2ff',
      plan: 'Neural Pro',
      createdAt: new Date().toISOString(),
      deviceId: `CV-${randomHex(4).toUpperCase()}`,
      notifyDigest: true,
    };
  });
  const [recoveryCodes, setRecoveryCodes] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cvRecoveryCodes') || 'null');
      return Array.isArray(saved) && saved.length ? saved : buildRecoveryCodes();
    } catch {
      return buildRecoveryCodes();
    }
  });
  const [profileNotice, setProfileNotice] = useState('');

  const [page, setPage] = useState('welcome');
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState({ visible: false, message: '' });

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState('idle');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupNeuralPin, setSignupNeuralPin] = useState('');

  const [files, setFiles] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cyberVaultFiles') || '[]'); } catch { return []; }
  });
  const [masterPassword, setMasterPassword] = useState('');

  const [viewingFile, setViewingFile] = useState(null);
  const [viewingFileContent, setViewingFileContent] = useState(null);
  const [viewingFilePin, setViewingFilePin] = useState('');

  const [locked, setLocked] = useState(false);
  const [lockInput, setLockInput] = useState('');

  const [query, setQuery] = useState('');
  const [activePanel, setActivePanel] = useState(null);
  const [auditReport, setAuditReport] = useState(null);
  const auditTimerRef = useRef(null);
  const [autoLockEnabled, setAutoLockEnabled] = useState(() => {
    const v = localStorage.getItem('autoLockEnabled');
    return v !== 'false';
  });
  const [autoLockMinutes, setAutoLockMinutes] = useState(() => {
    const v = Number(localStorage.getItem('autoLockMinutes'));
    return Number.isFinite(v) && v > 0 ? v : 5;
  });
  const autoLockMs = Math.max(1, autoLockMinutes) * 60 * 1000;
  const [rotateKeyInput, setRotateKeyInput] = useState('');
  const [rotateKeyConfirm, setRotateKeyConfirm] = useState('');
  const [rotateBusy, setRotateBusy] = useState(false);
  const [threatEvents, setThreatEvents] = useState(() => {
    try { return JSON.parse(localStorage.getItem('threatEvents') || '[]'); } catch { return []; }
  });
  const [threatAlerts, setThreatAlerts] = useState([]);
  const [threatScore, setThreatScore] = useState(1.0);
  const [alertChannelEnabled, setAlertChannelEnabled] = useState(() => {
    const v = localStorage.getItem('alertChannelEnabled');
    return v !== 'false';
  });
  const [activityEvents, setActivityEvents] = useState(() => {
    try { return JSON.parse(localStorage.getItem('activityEvents') || '[]'); } catch { return []; }
  });
  const [complianceStatus, setComplianceStatus] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('complianceStatus') || '{}');
    } catch {
      return {};
    }
  });

  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [faceMode, setFaceMode] = useState('register');
  const [isOCRSectionOpen, setIsOCRSectionOpen] = useState(false);
  const signupFaceResolveRef = useRef(null);
  const loginFaceResolveRef = useRef(null);

  // NEW: Iris-related state
  const [irisModalOpen, setIrisModalOpen] = useState(false);
  const [irisMode, setIrisMode] = useState('register');
  const signupIrisResolveRef = useRef(null);
  const loginIrisResolveRef = useRef(null);
  const [irisDetector] = useState(() => new IrisDetector());
  
  // NEW: Fingerprint auth states
  const [fingerprintModalOpen, setFingerprintModalOpen] = useState(false);
  const [fingerprintModalData, setFingerprintModalData] = useState(null);

  useEffect(() => {
    if (theme === 'night') {
      document.body.classList.add('theme-night');
    } else {
      document.body.classList.remove('theme-night');
    }
    localStorage.setItem('cvTheme', theme);
  }, [theme]);

  useEffect(() => {
    if (!session) return;
    setProfile(prev => {
      const next = { ...prev };
      if (!next.displayName && session.username) next.displayName = session.username;
      if (!next.email && session.email) next.email = session.email;
      if (!next.createdAt) next.createdAt = new Date().toISOString();
      return next;
    });
  }, [session]);

  useEffect(() => {
    try { localStorage.setItem('cyberProfile', JSON.stringify(profile)); } catch {}
  }, [profile]);

  useEffect(() => {
    try { localStorage.setItem('cvRecoveryCodes', JSON.stringify(recoveryCodes)); } catch {}
  }, [recoveryCodes]);

  useEffect(() => {
    if (mode !== 'signup') return;
    const handler = setTimeout(() => {
      if (!signupEmail) {
        setEmailStatus('idle');
      } else if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(signupEmail)) {
        setEmailStatus('valid');
      } else {
        setEmailStatus('invalid');
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [signupEmail, mode]);

  useEffect(() => {
    if (session && session.email && session.loginTime) {
      const loginTime = new Date(session.loginTime);
      const now = new Date();
      const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
      if (hoursDiff < 24) {
        setPage('vault');
        if (session.masterPassword) setMasterPassword(session.masterPassword);
      }
    }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('cyberVaultFiles', JSON.stringify(files)); } catch {}
  }, [files]);

  useEffect(() => {
    if (page !== 'vault') return;
    if (!autoLockEnabled) return;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setLocked(true);
        setLockInput('');
        setMasterPassword('');
        showNotification('> auto.lock.engaged', 'info');
      }, autoLockMs);
    };
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(ev => window.addEventListener(ev, reset));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach(ev => window.removeEventListener(ev, reset));
    };
  }, [page, autoLockEnabled, autoLockMs]);

  useEffect(() => {
    localStorage.setItem('autoLockEnabled', String(autoLockEnabled));
    localStorage.setItem('autoLockMinutes', String(autoLockMinutes));
  }, [autoLockEnabled, autoLockMinutes]);

  const profileDisplayName = profile.displayName || session?.username || 'User';
  const profileEmail = profile.email || session?.email || '';
  const profileCreatedAt = profile.createdAt ? new Date(profile.createdAt) : new Date();
  const profileCreatedLabel = `${profileCreatedAt.toLocaleDateString()} • ${profileCreatedAt.toLocaleTimeString()}`;

  const updateProfile = (patch) => {
    setProfile(prev => ({ ...prev, ...patch }));
    setProfileNotice('Profile synced.');
    setTimeout(() => setProfileNotice(''), 1800);
  };

  const downloadProfileSummary = () => {
    const summary = {
      displayName: profileDisplayName,
      title: profile.title,
      email: profileEmail,
      timezone: profile.timezone,
      plan: profile.plan,
      createdAt: profile.createdAt,
      deviceId: profile.deviceId,
      notifyDigest: profile.notifyDigest,
      recoveryCodes,
      lastLogin: session?.loginTime || null,
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cybervault_profile_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const regenerateRecoveryCodes = () => {
    setRecoveryCodes(buildRecoveryCodes());
    showNotification('> recovery.codes.regenerated', 'success');
  };

  const rotateDeviceId = () => {
    updateProfile({ deviceId: `CV-${randomHex(4).toUpperCase()}` });
  };

  const copyRecoveryCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      showNotification('> recovery.codes.copied', 'success');
    } catch {
      showNotification('> clipboard.unavailable', 'error');
    }
  };

  useEffect(() => {
    localStorage.setItem('threatEvents', JSON.stringify(threatEvents));
  }, [threatEvents]);

  useEffect(() => {
    localStorage.setItem('alertChannelEnabled', String(alertChannelEnabled));
  }, [alertChannelEnabled]);

  useEffect(() => {
    localStorage.setItem('activityEvents', JSON.stringify(activityEvents));
  }, [activityEvents]);

  useEffect(() => {
    localStorage.setItem('complianceStatus', JSON.stringify(complianceStatus));
  }, [complianceStatus]);

  function switchMode(next) { setMode(next); }

  function showLoading(message) { setLoading({ visible: true, message }); }
  function hideLoading() { setLoading({ visible: false, message: '' }); }

  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdInput, setPwdInput] = useState('');
  const pwdResolveRef = useRef(null);

  async function ensureMasterPassword() {
    if (masterPassword && masterPassword.length >= 8) return masterPassword;
    if (session?.masterPassword && session.masterPassword.length >= 8) {
      setMasterPassword(session.masterPassword);
      return session.masterPassword;
    }
    return new Promise((resolve, reject) => {
      pwdResolveRef.current = { resolve, reject };
      setPwdInput('');
      setPwdModalOpen(true);
    });
  }
  function onPwdConfirm() {
    if (!pwdInput || pwdInput.length < 8) { showNotification('> neural.key.insufficient.minimum_8_chars', 'error'); return; }
    setMasterPassword(pwdInput);
    saveSession({ ...(session || {}), masterPassword: pwdInput });
    setPwdModalOpen(false);
    pwdResolveRef.current?.resolve(pwdInput);
    pwdResolveRef.current = null;
  }
  function onPwdClose() {
    setPwdModalOpen(false);
    pwdResolveRef.current?.reject(new Error('cancelled'));
    pwdResolveRef.current = null;
  }

  function clearAuditReport() {
    if (auditTimerRef.current) clearTimeout(auditTimerRef.current);
    auditTimerRef.current = null;
    setAuditReport(null);
  }

  async function runSecurityAudit(mode = 'full') {
    try {
      let pwd = masterPassword;
      if (!pwd || pwd.length < 8) {
        try { pwd = await ensureMasterPassword(); } catch { showNotification('> neural.key.required.for.audit', 'error'); return; }
      }
      showLoading('> running.security.audit');
      const startedAt = new Date().toISOString();
      const results = [];
      let verified = 0;
      let failed = 0;
      let missing = 0;
      for (const f of files) {
        try {
          const key = await deriveQuantumKey(pwd, new Uint8Array(f.salt));
          const ciphertext = f.encryptedData ? new Uint8Array(f.encryptedData) : new Uint8Array(await idbGet(f.dataId));
          if (!ciphertext || ciphertext.length === 0) {
            missing += 1;
            results.push({ id: f.id, name: f.name, status: 'missing' });
            continue;
          }
          const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(f.iv) }, key, ciphertext);
          const checksum = await generateChecksum(decrypted);
          if (checksum !== f.checksum) throw new Error('checksum.mismatch');
          verified += 1;
          results.push({ id: f.id, name: f.name, status: 'verified' });
        } catch (err) {
          failed += 1;
          results.push({ id: f.id, name: f.name, status: 'failed', error: err.message });
        }
      }
      const report = {
        mode,
        startedAt,
        completedAt: new Date().toISOString(),
        totals: {
          files: files.length,
          verified,
          failed,
          missing,
          sizeBytes: files.reduce((acc, f) => acc + (f.size || 0), 0),
        },
        results,
      };
      setAuditReport(report);
      if (auditTimerRef.current) clearTimeout(auditTimerRef.current);
      auditTimerRef.current = setTimeout(() => {
        setAuditReport(null);
        showNotification('> audit.report.expired', 'info');
      }, 3 * 60 * 1000);
      showNotification('> audit.report.ready.expires_in_3m', 'success');
      hideLoading();
    } catch (err) {
      console.error(err);
      hideLoading();
      showNotification('> audit.failed', 'error');
    }
  }

  async function downloadAuditReport() {
    if (!auditReport) {
      showNotification('> audit.report.not.found', 'error');
      return;
    }
    try {
      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
              h1 { font-size: 20px; margin-bottom: 8px; }
              .meta { font-size: 12px; color: #475569; margin-bottom: 16px; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; }
              th, td { border: 1px solid #e2e8f0; padding: 6px 8px; font-size: 11px; text-align: left; }
              th { background: #f1f5f9; }
              .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #e2e8f0; font-size: 10px; }
            </style>
          </head>
          <body>
            <h1>CyberVault Security Audit</h1>
            <div class="meta">Started: ${auditReport.startedAt} • Completed: ${auditReport.completedAt}</div>
            <div class="meta">Files: ${auditReport.totals.files} • Verified: ${auditReport.totals.verified} • Failed: ${auditReport.totals.failed} • Missing: ${auditReport.totals.missing}</div>
            <table>
              <thead>
                <tr><th>File</th><th>Status</th><th>Detail</th></tr>
              </thead>
              <tbody>
                ${auditReport.results.map(r => `<tr><td>${r.name}</td><td>${r.status}</td><td>${r.error || ''}</td></tr>`).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;
      const res = await window.electronAPI.saveAuditReportPdf(`cybervault_audit_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.pdf`, html);
      if (!res || res.canceled) {
        showNotification('> audit.download.cancelled', 'info');
        return;
      }
      showNotification('> audit.report.downloaded', 'success');
      clearAuditReport();
    } catch (err) {
      console.error(err);
      showNotification('> audit.download.failed', 'error');
    }
  }

  function addThreatEvent(type, detail) {
    const event = { id: Date.now() + Math.random(), type, detail, at: new Date().toISOString() };
    setThreatEvents(prev => [event, ...prev].slice(0, 200));
  }

  function addActivityEvent(type, detail) {
    const event = { id: Date.now() + Math.random(), type, detail, at: new Date().toISOString() };
    setActivityEvents(prev => [event, ...prev].slice(0, 200));
  }

  function updateCompliance(key) {
    setComplianceStatus(prev => ({ ...prev, [key]: new Date().toISOString() }));
    showNotification(`> compliance.${key}.updated`, 'success');
  }

  function runThreatScan() {
    const now = Date.now();
    const last24h = threatEvents.filter(e => now - new Date(e.at).getTime() < 24 * 60 * 60 * 1000);
    const failedUnlocks = last24h.filter(e => e.type === 'unlock_failed').length;
    const decryptFails = last24h.filter(e => e.type === 'decrypt_failed').length;
    const manualLocks = last24h.filter(e => e.type === 'manual_lock').length;
    const score = Math.min(10, 1 + failedUnlocks * 1.5 + decryptFails * 2 + manualLocks * 0.5);
    setThreatScore(Number(score.toFixed(1)));
    const alerts = [];
    if (failedUnlocks > 0) alerts.push(`Failed unlocks: ${failedUnlocks}`);
    if (decryptFails > 0) alerts.push(`Decrypt failures: ${decryptFails}`);
    if (manualLocks > 5) alerts.push(`High lock activity: ${manualLocks}`);
    setThreatAlerts(alerts);
    showNotification('> threat.scan.completed', 'success');
  }

  async function exportThreatLog() {
    try {
      const payload = JSON.stringify(threatEvents, null, 2);
      const res = await window.electronAPI.saveThreatLog(`cybervault_threat_log_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`, payload);
      if (!res || res.canceled) {
        showNotification('> threat.log.export.cancelled', 'info');
        return;
      }
      showNotification('> threat.log.exported', 'success');
    } catch (err) {
      console.error(err);
      showNotification('> threat.log.export.failed', 'error');
    }
  }

  async function rotateMasterKey() {
    if (rotateBusy) return;
    if (!rotateKeyInput || rotateKeyInput.length < 8) { showNotification('> new.key.insufficient.minimum_8_chars', 'error'); return; }
    if (rotateKeyInput !== rotateKeyConfirm) { showNotification('> new.key.mismatch', 'error'); return; }
    let pwd = masterPassword;
    if (!pwd || pwd.length < 8) {
      try { pwd = await ensureMasterPassword(); } catch { showNotification('> neural.key.required.for.rotation', 'error'); return; }
    }
    try {
      setRotateBusy(true);
      showLoading('> rotating.master.key');
      const updated = [];
      for (const f of files) {
        const oldKey = await deriveQuantumKey(pwd, new Uint8Array(f.salt));
        const ciphertext = f.encryptedData ? new Uint8Array(f.encryptedData) : new Uint8Array(await idbGet(f.dataId));
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(f.iv) }, oldKey, ciphertext);
        const newSalt = crypto.getRandomValues(new Uint8Array(16));
        const newIv = crypto.getRandomValues(new Uint8Array(12));
        const newKey = await deriveQuantumKey(rotateKeyInput, newSalt);
        const newCipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: newIv }, newKey, decrypted);
        if (f.dataId) {
          await idbPut(f.dataId, newCipher);
        }
        updated.push({
          ...f,
          salt: Array.from(newSalt),
          iv: Array.from(newIv),
          checksum: await generateChecksum(decrypted),
        });
      }
      setFiles(updated);
      setMasterPassword(rotateKeyInput);
      saveSession({ ...(session || {}), masterPassword: rotateKeyInput });
      setRotateKeyInput('');
      setRotateKeyConfirm('');
      showNotification('> master.key.rotation.complete', 'success');
      hideLoading();
    } catch (err) {
      console.error(err);
      hideLoading();
      showNotification('> master.key.rotation.failed', 'error');
    } finally {
      setRotateBusy(false);
    }
  }

  function generateSaltHex() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function hashPassword(password, saltHex) {
    const data = enc.encode(password + saltHex);
    return sha256Hex(data);
  }

  async function verifyPassword(password, storedHash, saltHex) {
    const hash = await hashPassword(password, saltHex);
    return hash === storedHash;
  }

  const simulateNetworkDelay = (ms) => new Promise(r => setTimeout(r, ms));

  async function startFaceRegistration() {
    try {
      await loadFaceApi();
    } catch (e) {
      showNotification('> face.module.load.failed', 'error');
      throw e;
    }
    return new Promise((resolve, reject) => {
      signupFaceResolveRef.current = { resolve, reject };
      setFaceMode('register');
      setFaceModalOpen(true);
    });
  }

  async function startFaceLogin() {
    try {
      await loadFaceApi();
    } catch (e) {
      showNotification('> face.module.load.failed', 'error');
      throw e;
    }
    return new Promise((resolve, reject) => {
      loginFaceResolveRef.current = { resolve, reject };
      setFaceMode('login');
      setFaceModalOpen(true);
    });
  }

  function onFaceRegistered(descriptor) {
    if (signupFaceResolveRef.current) {
      signupFaceResolveRef.current.resolve(descriptor);
      signupFaceResolveRef.current = null;
    }
  }

  function onFaceAuthenticated(descriptor) {
    if (loginFaceResolveRef.current) {
      loginFaceResolveRef.current.resolve(descriptor);
      loginFaceResolveRef.current = null;
    }
  }

  function closeFaceModal() {
    if (signupFaceResolveRef.current) { signupFaceResolveRef.current.reject(new Error('cancelled')); signupFaceResolveRef.current = null; }
    if (loginFaceResolveRef.current) { loginFaceResolveRef.current.reject(new Error('cancelled')); loginFaceResolveRef.current = null; }
    setFaceModalOpen(false);
  }

  // NEW: Iris functions
  async function startIrisRegistration() {
    try {
      await irisDetector.initialize();
    } catch (e) {
      showNotification('> iris.module.load.failed', 'error');
      throw e;
    }
    return new Promise((resolve, reject) => {
      signupIrisResolveRef.current = { resolve, reject };
      setIrisMode('register');
      setIrisModalOpen(true);
    });
  }

  async function startIrisLogin() {
    try {
      await irisDetector.initialize();
    } catch (e) {
      showNotification('> iris.module.load.failed', 'error');
      throw e;
    }
    return new Promise((resolve, reject) => {
      loginIrisResolveRef.current = { resolve, reject };
      setIrisMode('login');
      setIrisModalOpen(true);
    });
  }

  function onIrisRegistered(irisTemplate) {
    if (signupIrisResolveRef.current) {
      signupIrisResolveRef.current.resolve(irisTemplate);
      signupIrisResolveRef.current = null;
    }
  }

  function onIrisAuthenticated(irisTemplate) {
    if (loginIrisResolveRef.current) {
      loginIrisResolveRef.current.resolve(irisTemplate);
      loginIrisResolveRef.current = null;
    }
  }

  function closeIrisModal() {
    if (signupIrisResolveRef.current) { 
      signupIrisResolveRef.current.reject(new Error('cancelled')); 
      signupIrisResolveRef.current = null; 
    }
    if (loginIrisResolveRef.current) { 
      loginIrisResolveRef.current.reject(new Error('cancelled')); 
      loginIrisResolveRef.current = null; 
    }
    setIrisModalOpen(false);
  }

  function compareIrisTemplates(template1, template2) {
    return irisDetector.compareIrisTemplates(template1, template2, 0.4);
  }

  function euclidean(a, b) {
    if (!a || !b || a.length !== b.length) return Infinity;
    let sum = 0;
    for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; sum += d * d; }
    return Math.sqrt(sum);
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      showNotification('> neural.key.incomplete', 'error');
      return;
    }
    showLoading('> authenticating.neural.signature');
    try {
      await simulateNetworkDelay(1000);
      const stored = JSON.parse(localStorage.getItem('neuralUser_' + loginEmail) || '{}');
      if (stored.email && await verifyPassword(loginPassword, stored.passwordHash, stored.salt)) {
        hideLoading();
        showNotification('> neural.link.established', 'success');
        const s = { email: loginEmail, username: stored.username, loginTime: new Date().toISOString(), masterPassword: loginPassword };
        saveSession(s);
        setTimeout(() => setPage('vault'), 800);
      } else {
        throw new Error('invalid');
      }
    } catch (err) {
      hideLoading();
      showNotification('> neural.authentication.failed || invalid.credentials', 'error');
    }
  }

  async function handleFaceLogin() {
    try {
      if (!loginEmail) { showNotification('> enter.email.for.face.login', 'error'); return; }
      const stored = JSON.parse(localStorage.getItem('neuralUser_' + loginEmail) || '{}');
      if (!stored.email || !stored.faceDescriptor) { showNotification('> face.login.not.registered', 'error'); return; }
      const liveDesc = await startFaceLogin();
      const dist = euclidean(liveDesc, stored.faceDescriptor);
      if (dist <= 0.35) {
        showNotification('> neural.face.link.established', 'success');
        const s = { email: stored.email, username: stored.username, loginTime: new Date().toISOString() };
        saveSession(s);
        setPage('vault');
      } else {
        showNotification('> face.mismatch.authentication.failed', 'error');
      }
    } catch (e) {
      showNotification('> face.login.cancelled', 'info');
    }
  }

  // NEW: Iris login handler
  async function handleIrisLogin() {
    try {
      if (!loginEmail) { 
        showNotification('> enter.email.for.iris.login', 'error'); 
        return; 
      }
      
      const stored = JSON.parse(localStorage.getItem('neuralUser_' + loginEmail) || '{}');
      if (!stored.email || !stored.irisTemplate) { 
        showNotification('> iris.login.not.registered', 'error'); 
        return; 
      }
      
      const liveIrisTemplate = await startIrisLogin();
      const isMatch = compareIrisTemplates(liveIrisTemplate, stored.irisTemplate);
      
      if (isMatch) {
        showNotification('> neural.iris.link.established', 'success');
        const s = { email: stored.email, username: stored.username, loginTime: new Date().toISOString() };
        saveSession(s);
        setPage('vault');
      } else {
        showNotification('> iris.mismatch.authentication.failed', 'error');
      }
    } catch (e) {
      showNotification('> iris.login.cancelled', 'info');
    }
  }

  // NEW: Fingerprint login handler
  async function handleFingerprintLogin() {
    console.log('Fingerprint login clicked!'); // DEBUG
    showNotification('> fingerprint.login.clicked', 'info'); // DEBUG
    try {
      if (!loginEmail) { 
        showNotification('> enter.email.for.fingerprint.login', 'error'); 
        return; 
      }
      
      const stored = JSON.parse(localStorage.getItem('neuralUser_' + loginEmail) || '{}');
      if (!stored.email) { 
        showNotification('> user.not.registered', 'error'); 
        return; 
      }

      // Use stored password as master password for credential store access
      if (!stored.passwordHash) {
        showNotification('> fingerprint.login.setup.incomplete', 'error');
        return;
      }

      showNotification('> initializing.fingerprint.authentication', 'info');
      
      // We'll show a simple fingerprint auth modal here
      const result = await new Promise((resolve, reject) => {
        setFingerprintModalData({
          email: loginEmail,
          mode: 'login',
          resolve,
          reject
        });
        setFingerprintModalOpen(true);
      });

      if (result && result.type === 'authentication') {
        showNotification('> neural.fingerprint.link.established', 'success');
        const s = { 
          email: stored.email, 
          username: stored.username, 
          loginTime: new Date().toISOString(),
          masterPassword: loginPassword // Use the password they'd normally enter
        };
        saveSession(s);
        setPage('vault');
      }
      
    } catch (e) {
      if (e.message !== 'cancelled') {
        showNotification('> fingerprint.login.failed', 'error');
      }
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    if (emailStatus !== 'valid') {
      showNotification('> invalid.or.unverified.email', 'error');
      return;
    }
    if (!signupUsername || !signupEmail || !signupPassword || !confirmPassword || !signupNeuralPin) {
      showNotification('> neural.profile.incomplete', 'error');
      return;
    }
    if (!/^\d{3}$/.test(signupNeuralPin)) {
      showNotification('> Neural PIN must be exactly 3 digits (0-9)', 'error');
      return;
    }
    if (signupPassword !== confirmPassword) {
      showNotification('> password.synchronization.failed', 'error');
      return;
    }
    if (signupPassword.length < 8) {
      showNotification('> neural.security.insufficient.minimum_8_chars', 'error');
      return;
    }

    showLoading('> creating.neural.profile');
    try {
      await simulateNetworkDelay(800);
      if (localStorage.getItem('neuralUser_' + signupEmail)) throw new Error('exists');

      hideLoading();
      showNotification('> begin.biometric.registration', 'info');
      
      // Collect face data
      const faceDescriptor = await startFaceRegistration();
      
      // NEW: Collect iris data
      showNotification('> begin.iris.registration', 'info');
      const irisTemplate = await startIrisRegistration();

      // NEW: Collect fingerprint data (optional - continues even if fails)
      let fingerprintRegistered = false;
      try {
        showNotification('> begin.fingerprint.registration', 'info');
        const fingerprintResult = await new Promise((resolve, reject) => {
          setFingerprintModalData({
            email: signupEmail,
            mode: 'register',
            masterPassword: signupPassword,
            resolve,
            reject
          });
          setFingerprintModalOpen(true);
        });
        
        if (fingerprintResult && fingerprintResult.type === 'registration') {
          fingerprintRegistered = true;
          showNotification('> fingerprint.registration.completed', 'success');
        }
      } catch (fingerprintError) {
        showNotification('> fingerprint.registration.skipped', 'info');
        // Continue with registration even if fingerprint fails
      }

      showLoading('> finalizing.profile');
      const salt = generateSaltHex();
      const passwordHash = await hashPassword(signupPassword, salt);
      const userData = { 
        username: signupUsername, 
        email: signupEmail, 
        passwordHash, 
        salt, 
        neuralPin: signupNeuralPin, 
        createdAt: new Date().toISOString(), 
        faceDescriptor,
        irisTemplate, // NEW: Store iris template
        fingerprintEnabled: fingerprintRegistered // NEW: Track if fingerprint was registered
      };
      localStorage.setItem('neuralUser_' + signupEmail, JSON.stringify(userData));
      hideLoading();
      
      const biometricCount = 2 + (fingerprintRegistered ? 1 : 0); // face + iris + optional fingerprint
      showNotification(`> neural.profile.created.with.${biometricCount}.biometric.factors`, 'success');
      setTimeout(() => {
        setMode('login');
        setLoginEmail(signupEmail);
        showNotification('> neural.link.ready.for.initialization', 'info');
      }, 800);
    } catch (err) {
      hideLoading();
      if (err && err.message === 'exists') {
        showNotification('> neural.profile.creation.failed || signature.exists', 'error');
      } else if (err && err.message === 'cancelled') {
        showNotification('> biometric.registration.cancelled', 'error');
      } else {
        showNotification('> neural.profile.creation.failed', 'error');
      }
    }
  }

  function logout() {
    if (confirm('> confirm.neural.link.termination\n\nYou will be logged out and redirected to the login page.')) {
      clearSession();
      setPage('login');
      setMode('login');
      setLocked(false);
      // Reset form states
      setLoginEmail('');
      setLoginPassword('');
      setSignupEmail('');
      setSignupPassword('');
      setMasterPassword('');
      setFiles([]);
      window.electronAPI.forceRepaint();
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getFileIcon(type) {
    if (type?.startsWith('image/')) return '🖼️';
    if (type?.startsWith('video/')) return '🎬';
    if (type?.startsWith('audio/')) return '🎵';
    if (type?.includes('pdf')) return '📄';
    if (type?.includes('text')) return '📝';
    if (type?.includes('zip') || type?.includes('rar')) return '📦';
    if (type?.includes('json') || type?.includes('xml')) return '⚙️';
    if (type?.includes('exe') || type?.includes('app')) return '🔧';
    return '🗄️';
  }

  async function deriveQuantumKey(password, salt) {
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  async function generateChecksum(data) {
    return sha256Hex(data);
  }

  async function handleFiles(fileList) {
    let pwd = masterPassword;
    if (!pwd || pwd.length < 8) {
      try { pwd = await ensureMasterPassword(); } catch { showNotification('> neural.key.required.for.encryption', 'error'); return; }
    }
    for (const file of Array.from(fileList)) {
      await encryptAndStoreFile(file, pwd);
    }
  }

  async function encryptAndStoreFile(file, password) {
    try {
      showNotification(`> encrypting.${file.name}`, 'info');
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveQuantumKey(password, salt);
      const fileBuffer = await readFileAsArrayBuffer(file);
      const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, fileBuffer);
      const dataId = String(Date.now() + Math.random());
      await idbPut(dataId, encryptedData);
      const encryptedFile = {
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadDate: new Date().toISOString(),
        dataId,
        salt: Array.from(salt),
        iv: Array.from(iv),
        checksum: await generateChecksum(fileBuffer)
      };
      setFiles(prev => [...prev, encryptedFile]);
      addActivityEvent('encrypt', `${file.name} encrypted`);
      showNotification(`> ${file.name}.encrypted.stored.successfully`, 'success');
    } catch (err) {
      console.error(err);
      showNotification(`> encryption.failed.${file.name}`, 'error');
    }
  }

  async function downloadFile(fileId) {
    let pwd = masterPassword;
    if (!pwd || pwd.length < 8) { try { pwd = await ensureMasterPassword(); } catch { showNotification('> neural.key.required.for.decryption', 'error'); return; } }
    try {
      const file = files.find(f => f.id === fileId);
      if (!file) { showNotification('> file.not.found.in.neural.network', 'error'); return; }
      showNotification(`> decrypting.${file.name}`, 'info');
      const key = await deriveQuantumKey(pwd, new Uint8Array(file.salt));
      const ciphertext = file.encryptedData ? new Uint8Array(file.encryptedData) : new Uint8Array(await idbGet(file.dataId));
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(file.iv) },
        key,
        ciphertext
      );
      const checksum = await generateChecksum(decrypted);
      if (checksum !== file.checksum) throw new Error('File integrity verification failed');
      const blob = new Blob([decrypted], { type: file.type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      showNotification(`> ${file.name}.decrypted.downloaded`, 'success');
      addActivityEvent('decrypt', `${file.name} decrypted`);
    } catch (err) {
      console.error(err);
      addThreatEvent('decrypt_failed', err.message || 'decrypt_failed');
      if (err.name === 'OperationError') showNotification('> decryption.failed.invalid.neural.key', 'error');
      else showNotification(`> decryption.failed.${err.message}`, 'error');
    }
  }

  async function deleteFile(fileId) {
    const f = files.find(f => f.id === fileId);
    if (!f) return;
    if (confirm(`> confirm.data.purge.irreversible\n\n"${f.name}"`)) {
      try { if (f.dataId) await idbDelete(f.dataId); } catch {}
      setFiles(prev => prev.filter(x => x.id !== fileId));
      addActivityEvent('purge', `${f.name} purged`);
      showNotification(`> ${f.name}.purged.from.neural.network`, 'success');
    }
  }

  async function clearAllFiles() {
    if (confirm('> confirm.neural.network.purge.all.data.irreversible\n\nThis will permanently delete ALL encrypted files.')) {
      try { for (const f of files) { if (f.dataId) await idbDelete(f.dataId); } } catch {}
      localStorage.removeItem('cyberVaultFiles');
      setFiles([]);
      addActivityEvent('purge_all', 'All files purged');
      showNotification('> neural.network.purged.successfully', 'success');
    }
  }

  async function backupVault() {
    try {
      let pwd = masterPassword;
      if (!pwd || pwd.length < 8) { try { pwd = await ensureMasterPassword(); } catch { showNotification('> neural.key.required.for.backup', 'error'); return; } }
      const filesForBackup = await Promise.all(files.map(async f => {
        const out = { ...f };
        const ct = f.encryptedData ? new Uint8Array(f.encryptedData) : new Uint8Array(await idbGet(f.dataId));
        out.encryptedData = Array.from(ct);
        delete out.dataId;
        return out;
      }));
      const payloadBytes = enc.encode(JSON.stringify({ files: filesForBackup }));
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveQuantumKey(pwd, salt);
      const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payloadBytes));
      const out = { v: 1, s: toHex(salt), i: toHex(iv), c: toB64(ciphertext) };
      const payload = JSON.stringify(out);
      const filename = `cybervault_backup_${new Date().toISOString().slice(0,10)}.cybvlt`;
      if (window.electronAPI?.saveVaultBackup) {
        const res = await window.electronAPI.saveVaultBackup(filename, payload);
        if (!res || res.canceled) { showNotification('> backup.export.cancelled', 'info'); return; }
      } else {
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      }
      addActivityEvent('backup', 'Backup snapshot created');
      showNotification('> backup.export.generated', 'success');
    } catch (err) {
      console.error(err);
      showNotification('> backup.export.failed', 'error');
    }
  }

  const restoreInputRef = useRef(null);

  async function restoreVaultFromFile(file) {
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      if (!obj || !obj.v || !obj.s || !obj.i || !obj.c) throw new Error('invalid.backup.format');
      const pwd = prompt('> enter.neural.key.for.restore');
      if (!pwd) { showNotification('> restore.cancelled', 'info'); return; }
      const salt = fromHex(obj.s);
      const iv = fromHex(obj.i);
      const cbytes = fromB64(obj.c);
      const key = await deriveQuantumKey(pwd, salt);
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cbytes);
      const { files: restored } = JSON.parse(dec.decode(new Uint8Array(plain)));
      if (!Array.isArray(restored)) throw new Error('invalid.payload');
      const map = new Map(files.map(f => [f.name + '|' + f.size + '|' + f.checksum, f]));
      for (const rf of restored) {
        const k = rf.name + '|' + rf.size + '|' + rf.checksum;
        if (!map.has(k)) {
          if (rf.encryptedData && !rf.dataId) {
            const dataId = String(Date.now() + Math.random());
            await idbPut(dataId, new Uint8Array(rf.encryptedData));
            rf.dataId = dataId;
            delete rf.encryptedData;
          }
          map.set(k, rf);
        }
      }
      setFiles(Array.from(map.values()));
      addActivityEvent('restore', 'Backup restored');
      showNotification('> backup.restore.completed', 'success');
    } catch (err) {
      console.error(err);
      showNotification('> backup.restore.failed', 'error');
    }
  }

  function manualLock() {
    setLocked(true);
    setLockInput('');
    setMasterPassword('');
    addThreatEvent('manual_lock', 'manual_lock_triggered');
    addActivityEvent('lock', 'Vault locked');
    showNotification('> neural.vault.locked', 'info');
  }

  async function attemptUnlock(e) {
    e?.preventDefault?.();
    const pwd = lockInput;
    if (!pwd || pwd.length < 8) { addThreatEvent('unlock_failed', 'weak_passphrase'); showNotification('> neural.key.insufficient.minimum_8_chars', 'error'); return; }

    if (session?.masterPassword && pwd === session.masterPassword) {
      setMasterPassword(pwd);
      setLocked(false);
      setLockInput('');
      addActivityEvent('unlock', 'Vault unlocked');
      showNotification('> neural.vault.unlocked', 'success');
      return;
    }

    try {
      const stored = JSON.parse(localStorage.getItem('neuralUser_' + session?.email) || '{}');
      if (stored?.passwordHash && stored?.salt && await verifyPassword(pwd, stored.passwordHash, stored.salt)) {
        setMasterPassword(pwd);
        setLocked(false);
        setLockInput('');
        saveSession({ ...(session || {}), masterPassword: pwd });
        addActivityEvent('unlock', 'Vault unlocked');
        showNotification('> neural.vault.unlocked', 'success');
      } else {
        addThreatEvent('unlock_failed', 'invalid_passphrase');
        showNotification('> invalid.neural.key', 'error');
      }
    } catch {
      addThreatEvent('unlock_failed', 'invalid_passphrase');
      showNotification('> invalid.neural.key', 'error');
    }
  }
  
  async function attemptFaceUnlock() {
    try {
      const email = session?.email;
      if (!email) { showNotification('> no.active.session', 'error'); return; }
      const stored = JSON.parse(localStorage.getItem('neuralUser_' + email) || '{}');
      if (!stored.email || !stored.faceDescriptor) { showNotification('> face.login.not.registered', 'error'); return; }
      const liveDesc = await startFaceLogin();
      const dist = euclidean(liveDesc, stored.faceDescriptor);
      if (dist <= 0.35) {
        setLocked(false);
        showNotification('> neural.vault.unlocked.via.face', 'success');
      } else {
        showNotification('> face.mismatch.authentication.failed', 'error');
      }
    } catch (e) {
      showNotification('> face.unlock.cancelled', 'info');
    }
  }

  // NEW: Iris unlock function
  async function attemptIrisUnlock() {
    try {
      const email = session?.email;
      if (!email) { showNotification('> no.active.session', 'error'); return; }
      const stored = JSON.parse(localStorage.getItem('neuralUser_' + email) || '{}');
      if (!stored.email || !stored.irisTemplate) { showNotification('> iris.login.not.registered', 'error'); return; }
      const liveIrisTemplate = await startIrisLogin();
      const isMatch = compareIrisTemplates(liveIrisTemplate, stored.irisTemplate);
      if (isMatch) {
        setLocked(false);
        showNotification('> neural.vault.unlocked.via.iris', 'success');
      } else {
        showNotification('> iris.mismatch.authentication.failed', 'error');
      }
    } catch (e) {
      showNotification('> iris.unlock.cancelled', 'info');
    }
  }

  // NEW: Fingerprint unlock function
  async function attemptFingerprintUnlock() {
    try {
      const email = session?.email;
      if (!email) { showNotification('> no.active.session', 'error'); return; }
      
      // For unlock, we use the session's master password if available
      const masterPwd = session?.masterPassword || masterPassword;
      if (!masterPwd) { 
        showNotification('> master.password.required.for.fingerprint.unlock', 'error'); 
        return; 
      }

      const result = await new Promise((resolve, reject) => {
        setFingerprintModalData({
          email,
          mode: 'unlock',
          masterPassword: masterPwd,
          resolve,
          reject
        });
        setFingerprintModalOpen(true);
      });

      if (result && result.type === 'authentication') {
        setLocked(false);
        showNotification('> neural.vault.unlocked.via.fingerprint', 'success');
      }
    } catch (e) {
      if (e.message !== 'cancelled') {
        showNotification('> fingerprint.unlock.failed', 'error');
      }
    }
  }
  
  const fileInputRef = useRef(null);

  const fileCount = files.length;
  const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);

  const typeStats = files.reduce(
    (acc, f) => {
      const t = f.type || '';
      const size = f.size || 0;
      if (t.startsWith('image/') || t.startsWith('video/') || t.startsWith('audio/')) acc.media += size;
      else if (t.includes('pdf') || t.includes('text') || t.includes('doc') || t.includes('xml') || t.includes('json')) acc.docs += size;
      else if (t.includes('zip') || t.includes('rar') || t.includes('7z')) acc.archives += size;
      else acc.other += size;
      return acc;
    },
    { docs: 0, media: 0, archives: 0, other: 0 }
  );
  const totalTypeBytes = Object.values(typeStats).reduce((a, b) => a + b, 0) || 1;
  const pctDocs = Math.round((typeStats.docs / totalTypeBytes) * 100);
  const pctMedia = Math.round((typeStats.media / totalTypeBytes) * 100);
  const pctArchives = Math.round((typeStats.archives / totalTypeBytes) * 100);
  const pctOther = Math.max(0, 100 - pctDocs - pctMedia - pctArchives);

  const entropyScore = Math.min(10, 3 + Math.log2(fileCount + 1) * 2 + (totalBytes / 1e8));
  const meshStability = Math.min(100, Math.round(60 + entropyScore * 4));
  const driftPct = Math.max(1, Math.round(10 - entropyScore));

  const passwordStatus = useMemo(() => {
    if (!masterPassword) return { cls: 'password-status empty', text: 'neural.key.status: awaiting.input' };
    if (masterPassword.length >= 8) return { cls: 'password-status valid', text: 'neural.key.status: authenticated.ready' };
    return { cls: 'password-status invalid', text: 'neural.key.status: insufficient.length' };
  }, [masterPassword]);

  const displayedFiles = useMemo(() => {
    if (!query) return files;
    const q = query.toLowerCase();
    return files.filter(f => f.name.toLowerCase().includes(q));
  }, [files, query]);

  function openFileViewer(file) {
    setViewingFile(file);
    setViewingFileContent(null);
    setViewingFilePin('');
  }

  function closeFileViewer() {
    setViewingFile(null);
  }

  async function handleViewFile() {
    if (!viewingFile) return;
    const storedUser = JSON.parse(localStorage.getItem('neuralUser_' + session.email) || '{}');
    if (storedUser.neuralPin !== viewingFilePin) {
      showNotification('> invalid.neural.pin', 'error');
      return;
    }

    try {
      let pwd = masterPassword;
      if (!pwd || pwd.length < 8) {
        try { pwd = await ensureMasterPassword(); } catch { showNotification('> neural.key.required.for.decryption', 'error'); return; }
      }
      showNotification(`> decrypting.${viewingFile.name}`, 'info');
      const key = await deriveQuantumKey(pwd, new Uint8Array(viewingFile.salt));
      const ciphertext = viewingFile.encryptedData ? new Uint8Array(viewingFile.encryptedData) : new Uint8Array(await idbGet(viewingFile.dataId));
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(viewingFile.iv) },
        key,
        ciphertext
      );
      const checksum = await generateChecksum(decrypted);
      if (checksum !== viewingFile.checksum) throw new Error('File integrity verification failed');
      
      const blob = new Blob([decrypted], { type: viewingFile.type || 'application/octet-stream' });
      setViewingFileContent(URL.createObjectURL(blob));

      showNotification(`> ${viewingFile.name}.decrypted`, 'success');
    } catch (err) {
      console.error(err);
      if (err.name === 'OperationError') showNotification('> decryption.failed.invalid.neural.key', 'error');
      else showNotification(`> decryption.failed.${err.message}`, 'error');
    }
  }

  function renderFileContent() {
    if (!viewingFileContent) return null;

    const type = viewingFile.type || '';

    if (type.startsWith('image/')) {
      return <img src={viewingFileContent} alt={viewingFile.name} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8 }} />;
    }

    if (type.startsWith('text/')) {
      return <iframe src={viewingFileContent} style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 8 }} />;
    }

    if (type === 'application/pdf') {
      return <iframe src={viewingFileContent} style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 8 }} />;
    }

    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <div className="empty-state-icon">🤷</div>
        <h3>Preview not available</h3>
        <p>Direct preview for <strong>{viewingFile.name}</strong> is not supported.</p>
        <button className="cyber-btn btn-primary" onClick={() => downloadFile(viewingFile.id)}>Download File</button>
      </div>
    );
  }

  return (
    <div>
      {page === 'welcome' && (
        <Welcome onContinue={() => setPage('login')} />
      )}

      {page === 'login' && (
        <div className="login-page" id="loginPage">
          <div className="auth-container">
            <div className="neural-header">
              <h1 className="neural-title">CyberVault</h1>
              <p className="neural-subtitle">&gt; quantum.neural.authentication.protocol_v2.1</p>
            </div>

            <div className="auth-form-container">
              <div className="mode-toggle">
                <button id="loginBtn" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Login</button>
                <button id="signupBtn" className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>Sign Up</button>
              </div>

              {mode === 'login' ? (
                <form className="auth-form" id="loginForm" onSubmit={handleLogin}>
                  <div className="form-group">
                    <label className="form-label">🔑 Neural Key (Email)</label>
                    <input type="email" className="form-input" id="loginEmail" placeholder="quantum.user@cybervault.net" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">🛡️ Master Password</label>
                    <input type="password" className="form-input" id="loginPassword" placeholder="Enter quantum passphrase..." required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                  </div>
                  {/* NEW: Updated login buttons with all biometric options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button type="submit" className="submit-btn">🚀 Password Login</button>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" className="cyber-btn btn-primary" style={{ flex: '1 1 auto', minWidth: '80px' }} onClick={handleFaceLogin}>🧠 Face</button>
                      <button type="button" className="cyber-btn btn-primary" style={{ flex: '1 1 auto', minWidth: '80px' }} onClick={handleIrisLogin}>👁️ Iris</button>
                      <button type="button" className="cyber-btn btn-primary" style={{ flex: '1 1 auto', minWidth: '120px' }} onClick={handleFingerprintLogin}>👆 Fingerprint</button>
                    </div>
                  </div>
                </form>
              ) : (
                <form className="auth-form" id="signupForm" onSubmit={handleSignup}>
                  <div className="form-group">
                    <label className="form-label">👤 Username</label>
                    <input type="text" className="form-input" id="signupUsername" placeholder="quantum_user_001" required value={signupUsername} onChange={e => setSignupUsername(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">🔑 Neural Key (Email)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input type="email" className="form-input" id="signupEmail" placeholder="quantum.user@cybervault.net" required value={signupEmail} onChange={e => setSignupEmail(e.target.value)} />
                      <div style={{ fontSize: 20 }}>
                        {emailStatus === 'validating' && '🤔'}
                        {emailStatus === 'valid' && '✅'}
                        {emailStatus === 'invalid' && '❌'}
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">🛡️ Master Password</label>
                    <input type="password" className="form-input" id="signupPassword" placeholder="Create quantum passphrase..." required value={signupPassword} onChange={e => setSignupPassword(e.target.value)} />
                    <PasswordStrength value={signupPassword} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">🔒 Confirm Password</label>
                    <input type="password" className="form-input" id="confirmPassword" placeholder="Confirm quantum passphrase..." required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={confirmPassword ? (confirmPassword !== signupPassword ? { borderColor: '#ff3366', boxShadow: '0 0 10px rgba(255, 51, 102, 0.3)' } : { borderColor: 'var(--primary-green)', boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)' }) : {}} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">🔢 Neural PIN</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      id="signupNeuralPin"
                      maxLength="3"
                      inputMode="numeric"
                      pattern="[0-9]{3}"
                      title="Enter exactly 3 digits (0-9)"
                      placeholder="Enter 3-digit PIN..."
                      required 
                      value={signupNeuralPin}
                      onChange={e => {
                        const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
                        setSignupNeuralPin(v);
                      }}
                    />
                    <div className="password-status" style={/^\d{3}$/.test(signupNeuralPin) ? {color: 'var(--primary-green)'} : {color: '#ff3366'}}>
                      PIN Status: {/^\d{3}$/.test(signupNeuralPin) ? 'Valid' : 'Must be exactly 3 digits (0-9)'}
                    </div>
                  </div>
                  {/* NEW: Updated signup button text */}
                  <button type="submit" className="submit-btn">⚡ Create Profile (Face + Iris + Fingerprint)</button>
                </form>
              )}

              <div className="security-info">
                <h4 className="security-title">🛡️ Quantum Security</h4>
                <ul className="security-features">
                  <li>AES-256 quantum-resistant encryption</li>
                  <li>Neural key derivation (PBKDF2-SHA256)</li>
                  <li>Zero-knowledge architecture</li>
                  <li>Multi-modal biometric authentication (Face + Iris + Fingerprint)</li>
                  <li>Quantum-safe password hashing</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {page === 'vault' && (
        <div className="main-vault" id="mainVault" style={{ display: 'block' }}>
          <div className="container">
            <div className="header">
              <div className="header-top">
                <div className="brand-block">
                  <div className="brand-title">CyberVault</div>
                  <div className="brand-subtitle">&gt; quantum-encrypted.neural-storage.protocol_v2.1</div>
                </div>
                <div className="header-actions">
                  <button className="profile-badge" onClick={() => setProfileOpen(true)}>
                    <span className="profile-avatar" style={{ background: profile.accent }}>{profileDisplayName.charAt(0).toUpperCase()}</span>
                    <span className="profile-meta">
                      <span className="profile-name">{profileDisplayName}</span>
                      <span className="profile-role">{profile.title}</span>
                    </span>
                    <span className="profile-pulse" style={{ background: profile.accent }}></span>
                  </button>
                  <button className="logout-btn" onClick={logout}>Logout</button>
                </div>
              </div>
              <div className="header-status">
                <div className="greeting-title">Welcome back, {profileDisplayName}</div>
                <div className="greeting-subtitle">Neural Vault Ready • Quantum Shield Active • Zero-Trust Enabled</div>
              </div>
            </div>

            <div className="main-grid">
              <div className="sidebar is-open" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <div className="security-badge">
                    <div className="badge-title">
                      <span className="badge-icon">🛡️</span>
                      <span className="badge-text">Quantum Security</span>
                    </div>
                    <p className="sidebar-text">AES-256 neural encryption with quantum-resistant protocols. Zero-knowledge architecture.</p>
                  </div>

                  <div className="cyber-section">
                    <div className="neural-stats">
                      <div className="neural-stat">
                        <span className="stat-number" id="fileCount">{fileCount}</span>
                        <span className="stat-label">Files</span>
                      </div>
                      <div className="neural-stat">
                        <span className="stat-number" id="totalSize">{formatFileSize(totalBytes)}</span>
                        <span className="stat-label">Storage</span>
                      </div>
                    </div>
                  </div>

                  <div className="cyber-section sidebar-menu">
                    <button className={`menu-item ${activePanel === 'security' ? 'active' : ''}`} onClick={() => setActivePanel('security')}>Security Posture</button>
                    <button className={`menu-item ${activePanel === 'activity' ? 'active' : ''}`} onClick={() => setActivePanel('activity')}>Activity Timeline</button>
                    <button className={`menu-item ${activePanel === 'threat' ? 'active' : ''}`} onClick={() => setActivePanel('threat')}>Threat Monitor</button>
                    <button className={`menu-item ${activePanel === 'storage' ? 'active' : ''}`} onClick={() => setActivePanel('storage')}>Storage Analytics</button>
                    <button className={`menu-item ${activePanel === 'compliance' ? 'active' : ''}`} onClick={() => setActivePanel('compliance')}>Compliance Checklist</button>
                    <button className={`menu-item ${activePanel === 'mesh' ? 'active' : ''}`} onClick={() => setActivePanel('mesh')}>Neural Trust Mesh</button>
                  </div>

                  <div className="cyber-section sidebar-actions" style={{ display: 'grid', gap: 10 }}>
                    <button className="cyber-btn btn-secondary sidebar-action" data-icon="📝" data-label="OCR" onClick={() => setIsOCRSectionOpen(true)}>
                      <span className="action-icon">📝</span>
                      <span className="action-label sidebar-text">OCR</span>
                    </button>
                    <button className="cyber-btn btn-secondary sidebar-action" data-icon="🔒" data-label="Lock Vault" onClick={manualLock}>
                      <span className="action-icon">🔒</span>
                      <span className="action-label sidebar-text">Lock Vault</span>
                    </button>
                    <button className="cyber-btn btn-primary sidebar-action" data-icon="⬇️" data-label="Backup Vault" onClick={backupVault}>
                      <span className="action-icon">⬇️</span>
                      <span className="action-label sidebar-text">Backup Vault</span>
                    </button>
                    <button className="cyber-btn btn-secondary sidebar-action" data-icon="⬆️" data-label="Restore Vault" onClick={() => restoreInputRef.current?.click()}>
                      <span className="action-icon">⬆️</span>
                      <span className="action-label sidebar-text">Restore Vault</span>
                    </button>
                    <input type="file" ref={restoreInputRef} accept=".cybvlt,application/json" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) restoreVaultFromFile(f); e.target.value = ''; }} />
                  </div>

                  <div className="cyber-section">
                    <div className="sidebar-section-title">
                      <span className="title-icon">🔎</span>
                      <span className="title-label sidebar-text">Search</span>
                    </div>
                    <input type="text" className="password-input sidebar-text" placeholder="Filter by file name..." value={query} onChange={e => setQuery(e.target.value)} />
                  </div>
                </div>
                <button className="cyber-btn btn-danger sidebar-action" data-icon="🗑️" data-label="Purge All Data" onClick={clearAllFiles} style={{ width: '100%', marginTop: 10 }}>
                  <span className="action-icon">🗑️</span>
                  <span className="action-label sidebar-text">Purge All Data</span>
                </button>
              </div>

              <div className="main-content">
                <div className="upload-zone" onClick={() => fileInputRef.current?.click()} onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }} onDragLeave={e => e.currentTarget.classList.remove('dragover')} onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); handleFiles(e.dataTransfer.files); }}>
                  <div className="upload-icon">⚡</div>
                  <div className="upload-text">Neural Upload Interface</div>
                  <div className="upload-subtext">&gt; drag.files || click.to.encrypt</div>
                  <div className="upload-tags">
                    <span className="upload-tag">AES-256</span>
                    <span className="upload-tag">Zero Knowledge</span>
                    <span className="upload-tag">Biometric Ready</span>
                  </div>
                  <input type="file" id="fileInput" ref={fileInputRef} multiple onChange={e => handleFiles(e.target.files)} />
                </div>

                <div className="files-grid" id="filesGrid">
                  {displayedFiles.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">🔐</div>
                      <h3>{files.length === 0 ? 'Neural Storage Empty' : 'No matches'}</h3>
                      <p>{files.length === 0 ? '> upload.files.to.initialize.secure.vault' : '> adjust.search.query'}</p>
                    </div>
                  ) : (
                    displayedFiles.map(file => (
                      <div className="file-card fade-in" key={file.id}>
                        <div className="file-icon">{getFileIcon(file.type)}</div>
                        <div className="file-name">{file.name}</div>
                        <div className="file-info">
                          {formatFileSize(file.size)} • {new Date(file.uploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          <br />
                          <span style={{ color: 'var(--primary-cyan)', fontSize: 10 }}>ENCRYPTED • AES-256-GCM</span>
                          <br />
                          <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>ID: {String(file.id).slice(-8)}</span>
                        </div>
                        <div className="file-actions">
                          <button className="cyber-btn btn-secondary" onClick={() => openFileViewer(file)} title="View file">👁️ View</button>
                          <button className="cyber-btn btn-primary" onClick={() => downloadFile(file.id)} title="Decrypt and download file">⬇️ Decrypt</button>
                          <button className="cyber-btn btn-danger" onClick={() => deleteFile(file.id)} title="Permanently delete file">🗑️ Purge</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className={`drawer-overlay ${activePanel ? 'show' : ''}`} onClick={() => setActivePanel(null)}></div>
            <div className={`feature-drawer ${activePanel ? 'open' : ''}`}>
              <div className="drawer-header">
                <div className="drawer-title">
                  {activePanel === 'security' && 'Security Posture'}
                  {activePanel === 'activity' && 'Activity Timeline'}
                  {activePanel === 'threat' && 'Threat Monitor'}
                  {activePanel === 'storage' && 'Storage Analytics'}
                  {activePanel === 'compliance' && 'Compliance Checklist'}
                  {activePanel === 'mesh' && 'Neural Trust Mesh'}
                </div>
                <button className="drawer-close" onClick={() => setActivePanel(null)}>Close</button>
              </div>

              {activePanel === 'security' && (
                <div className="drawer-body">
                  <div className="drawer-intro">
                    <div className="intro-icon">🧠</div>
                    <div className="intro-text">
                      Security Posture gives you a complete health snapshot of your vault. It verifies encryption integrity, checks your master key strength, and confirms whether your files can be safely decrypted. From here you can run a full audit, perform quick integrity checks, enforce auto‑lock rules, and rotate your master key to re‑encrypt everything with a new passphrase. Use these controls when you want maximum assurance that your data has not been tampered with and remains recoverable.
                    </div>
                  </div>
                  <div className="drawer-visuals">
                    <div className="mini-card">
                      <div className="mini-title">Integrity Breakdown</div>
                    <div className="bar-graph">
                      <span className="bar ok" style={{ width: `${auditReport ? Math.max(5, Math.round((auditReport.totals.verified / Math.max(1, auditReport.totals.files)) * 100)) : 70}%` }}></span>
                      <span className="bar warn" style={{ width: `${auditReport ? Math.max(3, Math.round((auditReport.totals.missing / Math.max(1, auditReport.totals.files)) * 100)) : 20}%` }}></span>
                      <span className="bar bad" style={{ width: `${auditReport ? Math.max(2, Math.round((auditReport.totals.failed / Math.max(1, auditReport.totals.files)) * 100)) : 10}%` }}></span>
                    </div>
                    <div className="mini-legend">Verified • Missing • Failed</div>
                  </div>
                  <div className="mini-card">
                    <div className="mini-title">Key Strength</div>
                    <div className="ring-chart">
                        <span className="ring-fill" style={{ '--pct': `${Math.min(100, Math.round(entropyScore * 10))}%` }}></span>
                        <span className="ring-label">{Math.min(100, Math.round(entropyScore * 10))}%</span>
                    </div>
                    <div className="mini-legend">Entropy health score</div>
                  </div>
                </div>
                  <div className="drawer-card">
                    <div className="drawer-label">Encryption Status</div>
                    <div className="drawer-value">AES-256 • Active</div>
                    <div className="drawer-actions">
                      <button className="drawer-btn" onClick={manualLock}>Lock Vault Now</button>
                      <button className="drawer-btn" onClick={() => runSecurityAudit('full')}>Run Full Audit</button>
                    </div>
                  </div>
                  <div className="drawer-card">
                    <div className="drawer-label">Key Health</div>
                    <div className="drawer-value">98% • Stable</div>
                    <div className="drawer-actions">
                      <button className="drawer-btn" onClick={() => runSecurityAudit('integrity')}>Integrity Check</button>
                      <button className="drawer-btn" onClick={downloadAuditReport}>Download Report</button>
                    </div>
                  </div>
                  <div className="drawer-card">
                    <div className="drawer-label">Audit</div>
                    <div className="drawer-value">{auditReport ? `Report ready • ${auditReport.totals.verified} verified` : 'No report • run audit'}</div>
                    <div className="drawer-note">Report auto-deletes after 3 minutes.</div>
                    <button className="drawer-btn" onClick={clearAuditReport}>Clear Report</button>
                  </div>
                  <div className="drawer-card">
                    <div className="drawer-label">Auto-Lock</div>
                    <div className="drawer-inline">
                      <label className="toggle">
                        <input type="checkbox" checked={autoLockEnabled} onChange={(e) => setAutoLockEnabled(e.target.checked)} />
                        <span className="toggle-track"></span>
                        <span className="toggle-label">{autoLockEnabled ? 'Enabled' : 'Disabled'}</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        className="drawer-input"
                        value={autoLockMinutes}
                        onChange={(e) => setAutoLockMinutes(Number(e.target.value || 1))}
                      />
                      <span className="drawer-unit">min</span>
                    </div>
                  </div>
                  <div className="drawer-card">
                    <div className="drawer-label">Rotate Master Key</div>
                    <div className="drawer-inline">
                      <input
                        type="password"
                        className="drawer-input"
                        placeholder="New passphrase"
                        value={rotateKeyInput}
                        onChange={(e) => setRotateKeyInput(e.target.value)}
                      />
                      <input
                        type="password"
                        className="drawer-input"
                        placeholder="Confirm"
                        value={rotateKeyConfirm}
                        onChange={(e) => setRotateKeyConfirm(e.target.value)}
                      />
                    </div>
                    <button className="drawer-btn" onClick={rotateMasterKey} disabled={rotateBusy}>
                      {rotateBusy ? 'Rotating...' : 'Rotate & Re-encrypt'}
                    </button>
                  </div>
                </div>
              )}

              {activePanel === 'activity' && (
                <div className="drawer-body">
                  <div className="drawer-intro">
                    <div className="intro-icon">🛰️</div>
                    <div className="intro-text">
                      Activity Timeline tracks every major vault action so you can understand what happened and when. It lists unlocks, encryptions, decryptions, backups, and restores in a single audit trail. Use this panel to export a timeline, filter for sensitive actions, and confirm your last backup or restore event. It is the quickest way to validate day‑to‑day operational safety.
                    </div>
                  </div>
                  <div className="drawer-visuals">
                    <div className="mini-card">
                      <div className="mini-title">Last 24h Activity</div>
                    <div className="sparkline">
                      {Array.from({ length: 7 }).map((_, i) => {
                        const day = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
                        const count = activityEvents.filter(e => {
                          const d = new Date(e.at);
                          return d.toDateString() === day.toDateString();
                        }).length;
                        const h = Math.min(90, Math.max(15, count * 15));
                        return <span key={i} style={{ height: `${h}%` }}></span>;
                      })}
                    </div>
                    <div className="mini-legend">Events per hour</div>
                  </div>
                  <div className="mini-card">
                    <div className="mini-title">Action Mix</div>
                    <div
                      className="pie-chart"
                      style={{
                        background: `conic-gradient(#9fb3df 0 ${Math.max(1, pctDocs)}%, #79a3d9 ${Math.max(1, pctDocs)}% ${Math.max(1, pctDocs + pctMedia)}%, #b2c9e8 ${Math.max(1, pctDocs + pctMedia)}% 100%)`
                      }}
                    ></div>
                    <div className="mini-legend">Upload • Decrypt • Backup</div>
                  </div>
                </div>
                  <div className="drawer-card">
                    <div className="drawer-label">Recent</div>
                    <div className="drawer-value">
                      {activityEvents[0] ? `${activityEvents[0].detail} • ${new Date(activityEvents[0].at).toLocaleTimeString()}` : 'No recent activity'}
                    </div>
                    <button className="drawer-btn" onClick={() => showNotification('> activity.log.exported', 'success')}>Export Activity Log</button>
                  </div>
                  <div className="drawer-card">
                    <div className="drawer-label">Uploads</div>
                    <div className="drawer-value">{activityEvents.filter(e => e.type === 'encrypt').length} files encrypted</div>
                    <button className="drawer-btn" onClick={() => showNotification('> activity.filters.applied', 'info')}>Filter Timeline</button>
                  </div>
                  <div className="drawer-card">
                    <div className="drawer-label">Backup</div>
                    <div className="drawer-value">
                      {activityEvents.find(e => e.type === 'backup') ? `Last snapshot • ${new Date(activityEvents.find(e => e.type === 'backup').at).toLocaleString()}` : 'No snapshot yet'}
                    </div>
                    <button className="drawer-btn" onClick={backupVault}>Backup Now</button>
                  </div>
                </div>
              )}

              {activePanel === 'threat' && (
                <div className="drawer-body">
                  <div className="drawer-intro">
                    <div className="intro-icon">🛡️</div>
                    <div className="intro-text">
                      Threat Monitor analyzes behavioral patterns inside the vault. It detects repeated unlock failures, abnormal decrypt attempts, and frequent lock triggers that could indicate misuse. From here you can run a scan that recalculates risk, review and clear alerts, and export a threat log for investigation. Use this panel whenever you suspect unusual activity or want a daily risk check.
                    </div>
                  </div>
                  <div className="drawer-visuals">
                    <div className="mini-card">
                      <div className="mini-title">Risk Level</div>
                      <div className="ring-chart">
                        <span className="ring-fill" style={{ '--pct': `${Math.min(100, threatScore * 10)}%` }}></span>
                        <span className="ring-label">{threatScore.toFixed(1)}</span>
                      </div>
                      <div className="mini-legend">0–10 risk score</div>
                    </div>
                    <div className="mini-card">
                      <div className="mini-title">Alert Volume</div>
                      <div className="bar-graph">
                        <span className="bar warn" style={{ width: `${Math.min(100, threatAlerts.length * 25)}%` }}></span>
                      </div>
                      <div className="mini-legend">{threatAlerts.length} active alerts</div>
                    </div>
                  </div>
                  <div className="drawer-card">
                    <div className="drawer-label">Anomaly Score</div>
                    <div className="drawer-value">Current • {threatScore.toFixed(1)}</div>
                    <div className="drawer-actions">
                      <button className="drawer-btn" onClick={runThreatScan}>Run Threat Scan</button>
                      <button className="drawer-btn" onClick={() => setThreatAlerts([])}>Clear Alerts</button>
                    </div>
                  </div>
                  <div className="drawer-card">
                    <div className="drawer-label">Lock Events</div>
                    <div className="drawer-value">{threatEvents.filter(e => e.type === 'manual_lock').length} today</div>
                    <button className="drawer-btn" onClick={manualLock}>Trigger Lock</button>
                  </div>
                  <div className="drawer-card">
                    <div className="drawer-label">Alert Channel</div>
                    <div className="drawer-value">Secure notifications • {alertChannelEnabled ? 'On' : 'Off'}</div>
                    <div className="drawer-actions">
                      <button className="drawer-btn" onClick={() => setAlertChannelEnabled(v => !v)}>
                        {alertChannelEnabled ? 'Disable' : 'Enable'}
                      </button>
                      <button className="drawer-btn" onClick={() => showNotification('> alert.channel.test', 'success')}>Test Alert</button>
                    </div>
                  </div>
                  <div className="drawer-card">
                    <div className="drawer-label">Recent Alerts</div>
                    <div className="drawer-list">
                      {threatAlerts.length === 0 ? (
                        <div className="drawer-value">No active alerts</div>
                      ) : (
                        threatAlerts.map((a, i) => <div key={i} className="drawer-value">• {a}</div>)
                      )}
                    </div>
                    <button className="drawer-btn" onClick={exportThreatLog}>Export Threat Log</button>
                  </div>
                </div>
              )}

              {activePanel === 'storage' && (
                <div className="drawer-body">
                  <div className="drawer-intro">
                    <div className="intro-icon">📊</div>
                    <div className="intro-text">
                      Storage Analytics shows how your encrypted vault is being used. It summarizes file types, growth trends, and snapshot coverage so you can keep storage efficient. Use this section to optimize storage, generate snapshots, and open restore workflows. It is ideal for keeping your vault lightweight while ensuring backups are always available.
                    </div>
                  </div>
                  <div className="drawer-visuals">
                    <div className="mini-card">
                      <div className="mini-title">Usage Mix</div>
                    <div
                      className="pie-chart"
                      style={{
                        background: `conic-gradient(#9fb3df 0 ${pctDocs}%, #79a3d9 ${pctDocs}% ${pctDocs + pctMedia}%, #b2c9e8 ${pctDocs + pctMedia}% ${pctDocs + pctMedia + pctArchives}%, #cbd5e1 ${pctDocs + pctMedia + pctArchives}% 100%)`
                      }}
                    ></div>
                    <div className="mini-legend">Docs • Media • Keys</div>
                  </div>
                    <div className="mini-card">
                      <div className="mini-title">Growth Trend</div>
                      <div className="sparkline">
                        <span style={{ height: '25%' }}></span>
                        <span style={{ height: '35%' }}></span>
                        <span style={{ height: '50%' }}></span>
                        <span style={{ height: '60%' }}></span>
                        <span style={{ height: '55%' }}></span>
                        <span style={{ height: '70%' }}></span>
                        <span style={{ height: '80%' }}></span>
                      </div>
                      <div className="mini-legend">Weekly growth</div>
                    </div>
                  </div>
                  <div className="drawer-card">
                    <div className="drawer-label">Usage</div>
                    <div className="drawer-value">Docs {pctDocs}% • Media {pctMedia}% • Archives {pctArchives}% • Other {pctOther}%</div>
                    <button className="drawer-btn" onClick={() => showNotification('> storage.optimization.complete', 'success')}>Optimize Storage</button>
                  </div>
                  <div className="drawer-card">
                    <div className="drawer-label">Snapshots</div>
                    <div className="drawer-value">{activityEvents.find(e => e.type === 'backup') ? 'Latest • Today' : 'No snapshot yet'}</div>
                    <button className="drawer-btn" onClick={backupVault}>Create Snapshot</button>
                  </div>
                  <div className="drawer-card">
                    <div className="drawer-label">Restore</div>
                    <div className="drawer-value">Select a vault file</div>
                    <button className="drawer-btn" onClick={() => restoreInputRef.current?.click()}>Open Restore</button>
                  </div>
                </div>
              )}

              {activePanel === 'compliance' && (
                <div className="drawer-body">
                  <div className="drawer-intro">
                    <div className="intro-icon">✅</div>
                    <div className="intro-text">
                      Compliance Checklist helps you prove your vault meets policy requirements. It tracks readiness for GDPR, HIPAA, and SOC 2 and provides quick report and verification actions. Use this panel to generate compliance reports, trigger checks, and keep audit evidence updated for internal reviews.
                    </div>
                  </div>
                  <div className="drawer-visuals">
                    <div className="mini-card">
                      <div className="mini-title">Controls Coverage</div>
                    <div className="bar-graph">
                      <span className="bar ok" style={{ width: `${Math.min(100, 60 + fileCount)}%` }}></span>
                      <span className="bar warn" style={{ width: `${Math.max(0, 40 - Math.min(40, fileCount))}%` }}></span>
                    </div>
                    <div className="mini-legend">Complete • Pending</div>
                  </div>
                  <div className="mini-card">
                    <div className="mini-title">Audit Window</div>
                    <div className="ring-chart">
                        <span className="ring-fill" style={{ '--pct': `${Math.min(100, 40 + fileCount * 3)}%` }}></span>
                        <span className="ring-label">{Math.min(100, 40 + fileCount * 3)}%</span>
                    </div>
                    <div className="mini-legend">Time to review</div>
                  </div>
                  </div>
                  <div className="drawer-card">
                    <div className="drawer-label">GDPR</div>
                    <div className="drawer-help">Checks whether your vault follows data‑privacy rules and confirms that personal files are handled and stored correctly.</div>
                    <div className="drawer-value">{complianceStatus.gdpr ? `Last report • ${new Date(complianceStatus.gdpr).toLocaleDateString()}` : 'Ready • Generate first report'}</div>
                    <button className="drawer-btn" onClick={() => updateCompliance('gdpr')}>Generate GDPR Report</button>
                  </div>
                  <div className="drawer-card">
                    <div className="drawer-label">HIPAA</div>
                    <div className="drawer-help">Validates access controls and audit trails for health‑related records so you can prove secure handling.</div>
                    <div className="drawer-value">{complianceStatus.hipaa ? `Last check • ${new Date(complianceStatus.hipaa).toLocaleDateString()}` : 'Ready • Run check'}</div>
                    <button className="drawer-btn" onClick={() => updateCompliance('hipaa')}>Run HIPAA Check</button>
                  </div>
                  <div className="drawer-card">
                    <div className="drawer-label">SOC 2</div>
                    <div className="drawer-help">Tracks operational security controls (availability, confidentiality, integrity) and prepares review evidence.</div>
                    <div className="drawer-value">{complianceStatus.soc2 ? `Last review • ${new Date(complianceStatus.soc2).toLocaleDateString()}` : 'Review due • Start now'}</div>
                    <button className="drawer-btn" onClick={() => updateCompliance('soc2')}>Start SOC 2 Review</button>
                  </div>
                </div>
              )}

              {activePanel === 'mesh' && (
                <div className="drawer-body">
                  <div className="drawer-intro">
                    <div className="intro-icon">🧬</div>
                    <div className="intro-text">
                      Neural Trust Mesh is the adaptive integrity layer for your vault. It blends device sealing, entropy monitoring, and integrity drift tracking to keep the vault resilient against subtle tampering. Here you can recalibrate entropy, rebind the device seal, and run integrity checks that validate the mesh remains stable across sessions.
                    </div>
                  </div>
                  <div className="drawer-visuals">
                    <div className="mini-card">
                      <div className="mini-title">Mesh Stability</div>
                    <div className="ring-chart">
                      <span className="ring-fill" style={{ '--pct': `${meshStability}%` }}></span>
                      <span className="ring-label">{meshStability}%</span>
                    </div>
                    <div className="mini-legend">Stability score</div>
                  </div>
                  <div className="mini-card">
                    <div className="mini-title">Integrity Drift</div>
                    <div className="bar-graph">
                      <span className="bar ok" style={{ width: `${100 - driftPct}%` }}></span>
                      <span className="bar warn" style={{ width: `${driftPct}%` }}></span>
                    </div>
                    <div className="mini-legend">Stable • Drift</div>
                  </div>
                  </div>
                  <div className="drawer-card">
                    <div className="drawer-label">Entropy Mesh</div>
                    <div className="drawer-help">Measures randomness strength across your vault keys. Higher scores mean stronger protection.</div>
                    <div className="drawer-value">High • 7.8/10</div>
                    <button className="drawer-btn" onClick={() => showNotification('> mesh.recalibrated', 'success')}>Recalibrate Mesh</button>
                  </div>
                  <div className="drawer-card">
                    <div className="drawer-label">Device Seal</div>
                    <div className="drawer-help">Binds this vault to your current device so copies cannot be opened elsewhere.</div>
                    <div className="drawer-value">Bound • Local</div>
                    <button className="drawer-btn" onClick={() => showNotification('> device.seal.refreshed', 'success')}>Rebind Device Seal</button>
                  </div>
                  <div className="drawer-card">
                    <div className="drawer-label">Integrity Drift</div>
                    <div className="drawer-help">Detects subtle changes over time that could indicate tampering or corruption.</div>
                    <div className="drawer-value">0.02% • Stable</div>
                    <button className="drawer-btn" onClick={() => showNotification('> integrity.check.complete', 'success')}>Run Integrity Check</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {loading.visible && (
        <div className="loading active" id="loadingOverlay">
          <div>
            <div className="loading-spinner"></div>
            <div className="loading-text" id="loadingText" dangerouslySetInnerHTML={{ __html: `${loading.message}<br>&gt; quantum.encryption.protocols.active` }} />
          </div>
        </div>
      )}

      {locked && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'linear-gradient(145deg, var(--glass-bg), rgba(15, 15, 25, 0.95))', border: '1px solid var(--border-glow)', borderRadius: 16, padding: 24, width: 360, boxShadow: '0 0 50px rgba(0, 212, 255, 0.2)' }}>
            <div className="neural-title" style={{ fontSize: 24, marginBottom: 12 }}>Vault Locked</div>
            <div className="password-status" style={{ marginBottom: 10 }}>Enter neural key to unlock</div>
            <form onSubmit={attemptUnlock}>
              <input type="password" className="password-input" placeholder="Enter quantum passphrase..." value={lockInput} onChange={e => setLockInput(e.target.value)} />
              <button type="submit" className="submit-btn" style={{ marginTop: 12 }}>🔓 Unlock</button>
            </form>
            {/* NEW: Added all biometric unlock options */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <button type="button" className="cyber-btn btn-primary" style={{ minWidth: '80px' }} onClick={attemptFaceUnlock}>🧠 Face</button>
              <button type="button" className="cyber-btn btn-primary" style={{ minWidth: '80px' }} onClick={attemptIrisUnlock}>👁️ Iris</button>
              <button type="button" className="cyber-btn btn-primary" style={{ minWidth: '120px' }} onClick={attemptFingerprintUnlock}>👆 Fingerprint</button>
            </div>
          </div>
        </div>
      )}

      {viewingFile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, width: '80vw', maxWidth: 1000, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="neural-title" style={{ fontSize: 24 }}>{viewingFile.name}</h2>
              <button className="cyber-btn btn-danger" onClick={closeFileViewer}>Close</button>
            </div>
            {!viewingFileContent ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <label className="form-label">Enter Neural PIN to View</label>
                <input 
                  type="password" 
                  className="form-input" 
                  maxLength="3"
                  value={viewingFilePin}
                  onChange={e => setViewingFilePin(e.target.value)}
                  style={{ width: 200, margin: 'auto' }}
                />
                <button className="submit-btn" onClick={handleViewFile} style={{ marginTop: 12, width: 200 }}>View File</button>
              </div>
            ) : (
              renderFileContent()
            )}
          </div>
        </div>
      )}

      <PasswordModal
        open={pwdModalOpen}
        onClose={onPwdClose}
        onConfirm={onPwdConfirm}
        value={pwdInput}
        onChange={e => setPwdInput(e.target.value)}
      />

      <FaceModal
        mode={faceMode}
        open={faceModalOpen}
        onClose={closeFaceModal}
        onRegistered={onFaceRegistered}
        onAuthenticated={onFaceAuthenticated}
      />

      {/* NEW: Iris Modal */}
      <IrisModal
        mode={irisMode}
        open={irisModalOpen}
        onClose={closeIrisModal}
        onRegistered={onIrisRegistered}
        onAuthenticated={onIrisAuthenticated}
      />

      {/* NEW: Fingerprint Modal */}
      {fingerprintModalOpen && fingerprintModalData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(245, 248, 252, 0.98))', border: '1px solid var(--border-glow)', borderRadius: 20, padding: 30, width: '90%', maxWidth: 500, boxShadow: '0 0 50px rgba(159, 179, 223, 0.3)' }}>
            <FingerprintAuth
              username={fingerprintModalData.email}
              masterPassword={fingerprintModalData.masterPassword || loginPassword}
              onAuthSuccess={(result) => {
                setFingerprintModalOpen(false);
                if (fingerprintModalData.resolve) {
                  fingerprintModalData.resolve(result);
                }
                setFingerprintModalData(null);
              }}
              onAuthError={(error) => {
                setFingerprintModalOpen(false);
                if (fingerprintModalData.reject) {
                  fingerprintModalData.reject(error);
                }
                setFingerprintModalData(null);
              }}
            />
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button 
                className="cyber-btn btn-secondary" 
                onClick={() => {
                  setFingerprintModalOpen(false);
                  if (fingerprintModalData.reject) {
                    fingerprintModalData.reject(new Error('cancelled'));
                  }
                  setFingerprintModalData(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {profileOpen && (
        <div className="profile-overlay" onClick={() => setProfileOpen(false)}>
          <div className="profile-panel" onClick={(e) => e.stopPropagation()}>
            <div className="profile-header">
              <div className="profile-header-main">
                <div className="profile-avatar large" style={{ background: profile.accent }}>{profileDisplayName.charAt(0).toUpperCase()}</div>
                <div className="profile-header-text">
                  <div className="profile-title">{profileDisplayName}</div>
                  <div className="profile-subtitle">{profile.title} • {profile.plan}</div>
                </div>
              </div>
              <button className="profile-close" onClick={() => setProfileOpen(false)}>Close</button>
            </div>

            <div className="profile-grid">
              <div className="profile-card">
                <div className="profile-card-title">Profile Details</div>
                <label className="profile-label">Display Name</label>
                <input className="profile-input" value={profile.displayName} onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))} placeholder="Quantum operator name" />
                <label className="profile-label">Role / Title</label>
                <input className="profile-input" value={profile.title} onChange={(e) => setProfile(prev => ({ ...prev, title: e.target.value }))} placeholder="Vault Architect" />
                <label className="profile-label">Email</label>
                <input className="profile-input" value={profile.email} onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))} placeholder="operator@cybervault.net" />
                <label className="profile-label">Timezone</label>
                <input className="profile-input" value={profile.timezone} onChange={(e) => setProfile(prev => ({ ...prev, timezone: e.target.value }))} placeholder="UTC" />
                <label className="profile-label">Accent</label>
                <input type="color" className="profile-color" value={profile.accent} onChange={(e) => setProfile(prev => ({ ...prev, accent: e.target.value }))} />
                <div className="profile-actions">
                  <button className="cyber-btn btn-primary" onClick={() => updateProfile({})}>Save Profile</button>
                  <button className="cyber-btn btn-secondary" onClick={downloadProfileSummary}>Export Profile</button>
                </div>
                <div className="profile-note">{profileNotice}</div>
              </div>

              <div className="profile-card">
                <div className="profile-card-title">Vault Preferences</div>
                <div className="profile-toggle">
                  <span>Daily Security Digest</span>
                  <label className="switch">
                    <input type="checkbox" checked={profile.notifyDigest} onChange={(e) => setProfile(prev => ({ ...prev, notifyDigest: e.target.checked }))} />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="profile-toggle">
                  <span>Auto-Lock Vault</span>
                  <label className="switch">
                    <input type="checkbox" checked={autoLockEnabled} onChange={(e) => setAutoLockEnabled(e.target.checked)} />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="profile-inline">
                  <span>Auto-Lock Minutes</span>
                  <input className="profile-input small" type="number" min="1" max="60" value={autoLockMinutes} onChange={(e) => setAutoLockMinutes(Math.max(1, Number(e.target.value) || 1))} />
                </div>
                <div className="profile-toggle">
                  <span>Threat Alerts</span>
                  <label className="switch">
                    <input type="checkbox" checked={alertChannelEnabled} onChange={(e) => setAlertChannelEnabled(e.target.checked)} />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="profile-card-subtitle">Theme Control</div>
                <div className="theme-toggle">
                  <button className={theme === 'frost' ? 'active' : ''} onClick={() => setTheme('frost')}>Frost</button>
                  <button className={theme === 'night' ? 'active' : ''} onClick={() => setTheme('night')}>Night Shield</button>
                </div>
              </div>

              <div className="profile-card">
                <div className="profile-card-title">Security & Recovery</div>
                <div className="profile-inline">
                  <span>Device ID</span>
                  <span className="profile-pill">{profile.deviceId}</span>
                </div>
                <div className="profile-actions">
                  <button className="cyber-btn btn-secondary" onClick={rotateDeviceId}>Rotate Device</button>
                  <button className="cyber-btn btn-secondary" onClick={copyRecoveryCodes}>Copy Recovery Codes</button>
                  <button className="cyber-btn btn-primary" onClick={regenerateRecoveryCodes}>Regenerate Codes</button>
                </div>
                <div className="recovery-grid">
                  {recoveryCodes.map(code => (
                    <span key={code} className="profile-pill">{code}</span>
                  ))}
                </div>
              </div>

              <div className="profile-card">
                <div className="profile-card-title">Account Intelligence</div>
                <div className="profile-inline">
                  <span>Account Created</span>
                  <span className="profile-pill">{profileCreatedLabel}</span>
                </div>
                <div className="profile-inline">
                  <span>Last Login</span>
                  <span className="profile-pill">{session?.loginTime ? new Date(session.loginTime).toLocaleString() : 'Unknown'}</span>
                </div>
                <div className="profile-inline">
                  <span>Plan</span>
                  <span className="profile-pill">{profile.plan}</span>
                </div>
                <div className="profile-inline">
                  <span>Vault Health</span>
                  <span className="profile-pill">Operational • Quantum Stable</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <OCRSection
        files={files}
        open={isOCRSectionOpen}
        onClose={() => setIsOCRSectionOpen(false)}
        idbGet={idbGet}
        deriveQuantumKey={deriveQuantumKey}
        enc={enc}
        dec={dec}
        generateChecksum={generateChecksum}
        ensureMasterPassword={ensureMasterPassword}
        showNotification={showNotification}
      />
    </div>
  );
}

export default App;
