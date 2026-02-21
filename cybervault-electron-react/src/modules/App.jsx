import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Welcome from '../components/Welcome'; // Import welcome page

const OCRSection = lazy(() => import('../components/Chatbot'));
const IrisModal = lazy(() => import('../components/IrisModal'));
const FingerprintAuth = lazy(() => import('../components/FingerprintAuth'));
const MissionMode = lazy(() => import('../components/MissionMode'));

let pdfJsLibPromise;
async function loadPdfJsLib() {
  if (!pdfJsLibPromise) {
    pdfJsLibPromise = Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjsLib, workerUrl]) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default;
      return pdfjsLib;
    });
  }
  return pdfJsLibPromise;
}

let irisDetectorPromise;
async function loadIrisDetector() {
  if (!irisDetectorPromise) {
    irisDetectorPromise = import('../utils/irisDetection').then((mod) => new mod.default());
  }
  return irisDetectorPromise;
}

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
  const normalize = (raw) => {
    const text = String(raw || '').trim().replace(/^>\s*/, '');
    if (!text) return 'Notification';
    return text
      .replace(/[._]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };
  const titleMap = { success: 'Success', error: 'Action Failed', info: 'Notice' };
  const iconMap = { success: 'OK', error: 'ERR', info: 'INFO' };
  const title = titleMap[type] || 'Notice';
  const body = normalize(message);

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-inner">
      <span class="notification-icon">${iconMap[type] || 'INFO'}</span>
      <div class="notification-copy">
        <div class="notification-title">${title}</div>
        <div class="notification-text">${body}</div>
      </div>
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.classList.add('show'), 90);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (document.body.contains(notification)) document.body.removeChild(notification);
    }, 280);
  }, 3200);
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

function buildDefaultProfile(overrides = {}) {
  return {
    displayName: '',
    title: 'Vault Operator',
    email: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    accent: '#7aa2ff',
    avatarUrl: '',
    plan: 'Neural Pro',
    createdAt: new Date().toISOString(),
    deviceId: `CV-${randomHex(4).toUpperCase()}`,
    notifyDigest: true,
    ...overrides,
  };
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
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      try {
        if (session?.email) { setSessionLoaded(true); return; }
        if (window.electronAPI?.readAppState) {
          const state = await window.electronAPI.readAppState();
          if (!cancelled && state?.session?.email && state?.session?.loginTime) {
            setSession(state.session);
            localStorage.setItem('neuralSession', JSON.stringify(state.session));
          }
        }
      } catch {}
      if (!cancelled) setSessionLoaded(true);
    }
    hydrate();
    return () => { cancelled = true; };
  }, []);

  function saveSession(s) {
    setSession(s);
    localStorage.setItem('neuralSession', JSON.stringify(s));
    if (window.electronAPI?.writeAppState) {
      try { window.electronAPI.writeAppState({ session: s }); } catch {}
    }
  }
  function clearSession() {
    setSession(null);
    localStorage.removeItem('neuralSession');
    if (window.electronAPI?.writeAppState) {
      try { window.electronAPI.writeAppState({ session: null }); } catch {}
    }
  }
  return { session, saveSession, clearSession, sessionLoaded };
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
      0: ['neural.security.level: critical.vulnerability', 'linear-gradient(90deg,#ff4d4f,#cc2f2f)'],
      1: ['neural.security.level: critical.vulnerability', 'linear-gradient(90deg,#ff4d4f,#cc2f2f)'],
      2: ['neural.security.level: insufficient.protection', 'linear-gradient(90deg,#ff9f43,#ff7a17)'],
      3: ['neural.security.level: moderate.encryption', 'linear-gradient(90deg,#ffb26f,#ff8f2d)'],
      4: ['neural.security.level: strong.quantum.resistance', 'linear-gradient(90deg,#ffc180,#ff9b4f)'],
      5: ['neural.security.level: maximum.protection', 'linear-gradient(90deg,#ffd0a2,#ffb26f)'],
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
const DB_VERSION = 2;
const DB_STORE = 'files';
const DB_META = 'meta';
function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      if (!db.objectStoreNames.contains(DB_META)) db.createObjectStore(DB_META);
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

async function getEncryptedBytes(file) {
  if (file.encryptedData) return new Uint8Array(file.encryptedData);
  if (file.dataId) {
    try {
      const fromIdb = await idbGet(file.dataId);
      if (fromIdb) return new Uint8Array(fromIdb);
    } catch {}
    if (window.electronAPI?.readVaultBlob) {
      try {
        const raw = await window.electronAPI.readVaultBlob(`${file.dataId}.bin`);
        if (Array.isArray(raw)) return new Uint8Array(raw);
      } catch {}
    }
  }
  return null;
}
function idbPutMeta(key, value) {
  return idbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(DB_META, 'readwrite');
    tx.objectStore(DB_META).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}
function idbGetMeta(key) {
  return idbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(DB_META, 'readonly');
    const rq = tx.objectStore(DB_META).get(key);
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error);
  }));
}
function idbDeleteMeta(key) {
  return idbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(DB_META, 'readwrite');
    tx.objectStore(DB_META).delete(key);
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

              const options = new window.faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.6, inputSize: 224 });
              const res = await window.faceapi
                .detectSingleFace(videoRef.current, options)
                .withFaceLandmarks()
                .withFaceDescriptor();

              if (res && res.descriptor) {
                const { detection } = res;
                const { box } = detection;
                const faceCenterX = box.x + box.width / 2;
                const faceCenterY = box.y + box.height / 2;
                const faceArea = box.width * box.height;

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
                  const frameArea = frame.width * frame.height;
                  const ratio = faceArea / frameArea;
                  if (ratio < 0.35) {
                    setMessage('Move closer to the camera');
                    return;
                  }
                  if (ratio > 0.9) {
                    setMessage('Move slightly back');
                    return;
                  }
                  setMessage('Hold still... capturing');
                  samples.push(Array.from(res.descriptor));
                } else {
                  setMessage('Center your face inside the frame');
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
              } else {
                setMessage('No face detected. Face the camera and improve lighting.');
              }
            }, 120);
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
        <div className="password-status" style={{ marginBottom: 6 }}>
          {loading ? 'Loading...' : message}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>
          Tips: keep your face centered, remove glare, and hold still for 2–3 seconds.
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

function ConfirmModal({ open, title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onClose }) {
  if (!open) return null;
  return (
    <div className="confirm-overlay">
      <div className="confirm-panel">
        <div className="confirm-title">{title}</div>
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button className="cyber-btn btn-secondary" onClick={onClose}>{cancelText}</button>
          <button
            className="cyber-btn btn-primary"
            onClick={() => {
              onClose?.();
              onConfirm?.();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExportModal({ open, file, recommended, onSelect, onClose }) {
  if (!open || !file) return null;
  const recLabel = recommended === 'text' ? 'Text' : recommended === 'img' ? 'Image' : 'PDF';
  return (
    <div className="confirm-overlay">
      <div className="confirm-panel export-panel">
        <div className="confirm-title">Export File</div>
        <div className="confirm-message">Choose a format to save to your system. Recommended: <strong>{recLabel}</strong></div>
        <div className="export-options">
          <button className={`export-option ${recommended === 'text' ? 'recommended' : ''}`} onClick={() => onSelect('text')}>
            Text
            {recommended === 'text' && <span className="export-badge">Recommended</span>}
          </button>
          <button className={`export-option ${recommended === 'img' ? 'recommended' : ''}`} onClick={() => onSelect('img')}>
            Image
            {recommended === 'img' && <span className="export-badge">Recommended</span>}
          </button>
          <button className={`export-option ${recommended === 'pdf' ? 'recommended' : ''}`} onClick={() => onSelect('pdf')}>
            PDF
            {recommended === 'pdf' && <span className="export-badge">Recommended</span>}
          </button>
        </div>
        <div className="confirm-actions">
          <button className="cyber-btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function AvatarCropModal({ open, src, zoom, rotation, onZoom, onRotate, onCancel, onSave }) {
  if (!open || !src) return null;
  return (
    <div className="confirm-overlay">
      <div className="confirm-panel avatar-crop-panel">
        <div className="confirm-title">Adjust Profile Icon</div>
        <div className="avatar-crop-preview" style={{
          backgroundImage: `url(${src})`,
          backgroundSize: `${zoom * 100}%`,
          backgroundPosition: '50% 50%',
          transform: `rotate(${rotation}deg)`,
        }} />
        <div className="avatar-crop-controls">
          <label>Zoom</label>
          <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={e => onZoom(Number(e.target.value))} />
          <label>Rotate</label>
          <input type="range" min="-180" max="180" step="1" value={rotation} onChange={e => onRotate(Number(e.target.value))} />
        </div>
        <div className="confirm-actions">
          <button className="cyber-btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="cyber-btn btn-primary" onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  useEasterEgg();
  useEffect(() => {
    const warmPdf = () => {
      loadPdfJsLib().catch(() => {});
    };
    if (window.requestIdleCallback) {
      const id = window.requestIdleCallback(warmPdf, { timeout: 4000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const timer = setTimeout(warmPdf, 2500);
    return () => clearTimeout(timer);
  }, []);
  const { session, saveSession, clearSession, sessionLoaded } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);
  const [theme, setTheme] = useState('night');
  const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', confirmText: 'Confirm', cancelText: 'Cancel', onConfirm: null });
  const [exportState, setExportState] = useState({ open: false, file: null, recommended: 'text' });
  const [avatarCrop, setAvatarCrop] = useState({ open: false, src: '', zoom: 1, rotation: 0, imgW: 0, imgH: 0 });
  const [profile, setProfile] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cyberProfile') || 'null');
      if (saved) return saved;
    } catch {}
    return buildDefaultProfile();
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
  const [demoAccessNotice, setDemoAccessNotice] = useState({ open: false, feature: '' });

  const [page, setPage] = useState('welcome');
  const handleGoToLogin = useCallback(() => {
    setMode('login');
    setPage('login');
  }, []);
  const handleGoToSignup = useCallback(() => {
    setMode('signup');
    setPage('login');
  }, []);
  const clearDemoSessionArtifacts = useCallback(async (email, currentFiles = []) => {
    const normalizedEmail = normalizeEmail(email) || 'demo@cybervault.local';
    try {
      for (const f of currentFiles || []) {
        if (f?.dataId) {
          try { await idbDelete(f.dataId); } catch {}
          if (window.electronAPI?.deleteVaultBlob) {
            try { await window.electronAPI.deleteVaultBlob(`${f.dataId}.bin`); } catch {}
          }
        }
      }
    } catch {}
    try {
      const keys = filesLegacyKeysFor(normalizedEmail);
      for (const key of keys) {
        localStorage.removeItem(key);
        try { await idbDeleteMeta(key); } catch {}
      }
    } catch {}
    if (window.electronAPI?.readVaultIndex && window.electronAPI?.writeVaultIndex) {
      try {
        const idx = await window.electronAPI.readVaultIndex() || {};
        delete idx[vaultIndexKey(normalizedEmail)];
        await window.electronAPI.writeVaultIndex(idx);
      } catch {}
    }
    setFiles([]);
    setPreviewData(null);
    setSelectedFileId(null);
    setPreviewOpen(false);
    setViewingFile(null);
    setViewingFileContent(null);
    setThreatEvents([]);
    setThreatAlerts([]);
    setActivityEvents([]);
    setComplianceStatus({});
  }, []);

  const startDemoMode = useCallback(async () => {
    await clearDemoSessionArtifacts('demo@cybervault.local', []);
    const demoSession = {
      email: 'demo@cybervault.local',
      username: 'Demo User',
      loginTime: new Date().toISOString(),
      demo: true,
    };
    saveSession(demoSession);
    setProfile(buildDefaultProfile({
      displayName: 'Demo User',
      title: 'Demo Session',
      email: 'demo@cybervault.local',
      accent: '#ff9a4a',
      plan: 'Guest',
    }));
    setMode('login');
    setPage('vault');
    showNotification('> demo.mode.active.one.file.limit.enabled', 'info');
  }, [saveSession, clearDemoSessionArtifacts]);
  const [missionOpen, setMissionOpen] = useState(false);
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

  const [files, setFiles] = useState([]);
  const filesHydratedRef = useRef(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [viewingFile, setViewingFile] = useState(null);
  const [viewingFileContent, setViewingFileContent] = useState(null);
  const [viewingFilePin, setViewingFilePin] = useState('');
  const [viewerFullscreen, setViewerFullscreen] = useState(false);
  const fileViewRef = useRef(null);
  const [anomalyPin, setAnomalyPin] = useState('');
  const [anomalyUnlocked, setAnomalyUnlocked] = useState(false);
  const [anomalyInfo, setAnomalyInfo] = useState({ open: false, event: null });
  const [pdfPageImages, setPdfPageImages] = useState([]);
  const [pdfRenderState, setPdfRenderState] = useState('idle');
  const [pdfScale] = useState(2.0);
  const [pdfViewZoom, setPdfViewZoom] = useState(1);
  const [pdfHd, setPdfHd] = useState(false);

  const [locked, setLocked] = useState(false);
  const [lockInput, setLockInput] = useState('');

  const [query, setQuery] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [contextMenu, setContextMenu] = useState({ open: false, x: 0, y: 0, file: null });
  const [globalDropActive, setGlobalDropActive] = useState(false);
  const [secureClipboard, setSecureClipboard] = useState({ active: false, expiresAt: 0, label: '' });
  const [activePanel, setActivePanel] = useState(null);
  const [auditReport, setAuditReport] = useState(null);
  const [activityRange, setActivityRange] = useState('7d');
  const [activityType, setActivityType] = useState('all');
  const [activityQuery, setActivityQuery] = useState('');
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
  // NEW: Fingerprint auth states
  const [fingerprintModalOpen, setFingerprintModalOpen] = useState(false);
  const [fingerprintModalData, setFingerprintModalData] = useState(null);
  const searchInputRef = useRef(null);

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
    if (session.demo) {
      setProfile(buildDefaultProfile({
        displayName: 'Demo User',
        title: 'Demo Session',
        email: 'demo@cybervault.local',
        accent: '#ff9a4a',
        plan: 'Guest',
      }));
      return;
    }
    setProfile(prev => {
      const next = { ...prev };
      if (!next.displayName && session.username) next.displayName = session.username;
      if (!next.email && session.email) next.email = session.email;
      if (!next.createdAt) next.createdAt = new Date().toISOString();
      return next;
    });
  }, [session]);

  useEffect(() => {
    if (session?.demo) return;
    try { localStorage.setItem('cyberProfile', JSON.stringify(profile)); } catch {}
  }, [profile, session?.demo]);

  useEffect(() => {
    if (session?.demo) return;
    try { localStorage.setItem('cvRecoveryCodes', JSON.stringify(recoveryCodes)); } catch {}
  }, [recoveryCodes, session?.demo]);

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
  }, [session]);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (page !== 'vault') return;
    let dragDepth = 0;
    function onDragEnter(e) {
      e.preventDefault();
      dragDepth += 1;
      setGlobalDropActive(true);
    }
    function onDragOver(e) {
      e.preventDefault();
      setGlobalDropActive(true);
    }
    function onDragLeave(e) {
      e.preventDefault();
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) setGlobalDropActive(false);
    }
    function onDrop(e) {
      e.preventDefault();
      dragDepth = 0;
      setGlobalDropActive(false);
      if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
    }
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [page, masterPassword, session?.email]);

  useEffect(() => {
    if (!contextMenu.open) return;
    const onClick = () => setContextMenu(prev => ({ ...prev, open: false }));
    const onEsc = (e) => {
      if (e.key === 'Escape') setContextMenu(prev => ({ ...prev, open: false }));
    };
    window.addEventListener('click', onClick);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onEsc);
    };
  }, [contextMenu.open]);

  useEffect(() => {
    if (!secureClipboard.active) return;
    const timer = setInterval(() => {
      if (Date.now() >= secureClipboard.expiresAt) {
        clearInterval(timer);
        navigator.clipboard?.writeText('').catch(() => {});
        setSecureClipboard({ active: false, expiresAt: 0, label: '' });
        showNotification('> secure.clipboard.cleared', 'info');
      }
    }, 500);
    return () => clearInterval(timer);
  }, [secureClipboard, showNotification]);

  const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
  const filesKeyFor = (email) => `cyberVaultFiles_${normalizeEmail(email) || 'anon'}`;
  const filesLegacyKeysFor = (email) => {
    const raw = String(email || 'anon');
    const normalized = normalizeEmail(email) || 'anon';
    return Array.from(new Set([`cyberVaultFiles_${raw}`, `cyberVaultFiles_${normalized}`, 'cyberVaultFiles']));
  };
  const vaultIndexKey = (email) => normalizeEmail(email) || 'anon';

  useEffect(() => {
    let cancelled = false;
    async function loadFiles() {
      if (!sessionLoaded) return;
      filesHydratedRef.current = false;
      if (!session?.email) {
        setFiles([]);
        return;
      }
      const key = filesKeyFor(session.email);
      const legacyKeys = filesLegacyKeysFor(session.email);
      for (const k of legacyKeys) {
        try {
          const stored = JSON.parse(localStorage.getItem(k) || 'null');
          if (Array.isArray(stored)) {
            setFiles(stored);
            if (k !== key) {
              try { localStorage.setItem(key, JSON.stringify(stored)); } catch {}
              try { await idbPutMeta(key, stored); } catch {}
            }
            filesHydratedRef.current = true;
            return;
          }
        } catch {}
      }
      for (const k of legacyKeys) {
        try {
          const storedMeta = await idbGetMeta(k);
          if (!cancelled && Array.isArray(storedMeta)) {
            setFiles(storedMeta);
            if (k !== key) {
              try { localStorage.setItem(key, JSON.stringify(storedMeta)); } catch {}
              try { await idbPutMeta(key, storedMeta); } catch {}
            }
            filesHydratedRef.current = true;
            return;
          }
        } catch {}
      }
      if (window.electronAPI?.readVaultIndex) {
        try {
          const index = await window.electronAPI.readVaultIndex();
          const list = index && Array.isArray(index[vaultIndexKey(session.email)]) ? index[vaultIndexKey(session.email)] : null;
          if (!cancelled && list) {
            setFiles(list);
            try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
            try { await idbPutMeta(key, list); } catch {}
            filesHydratedRef.current = true;
            return;
          }
        } catch {}
      }
      if (!cancelled) {
        setFiles([]);
        filesHydratedRef.current = true;
      }
    }
    loadFiles();
    return () => { cancelled = true; };
  }, [session?.email, sessionLoaded]);

  useEffect(() => {
    if (!session?.email) return;
    if (!filesHydratedRef.current) return;
    const key = filesKeyFor(session.email);
    try { localStorage.setItem(key, JSON.stringify(files)); } catch {}
    try { idbPutMeta(key, files); } catch {}
    if (window.electronAPI?.writeVaultIndex) {
      (async () => {
        try {
          const index = await window.electronAPI.readVaultIndex?.() || {};
          index[vaultIndexKey(session.email)] = files;
          await window.electronAPI.writeVaultIndex(index);
        } catch {}
      })();
    }
  }, [files, session?.email]);

  useEffect(() => {
    if (page !== 'vault') return;
    if (!autoLockEnabled) return;
    if (session?.demo) return;
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
  }, [page, autoLockEnabled, autoLockMs, session?.demo]);

  useEffect(() => {
    if (session?.demo) return;
    localStorage.setItem('autoLockEnabled', String(autoLockEnabled));
    localStorage.setItem('autoLockMinutes', String(autoLockMinutes));
  }, [autoLockEnabled, autoLockMinutes, session?.demo]);

  const isDemoSession = !!session?.demo;
  const profileDisplayName = isDemoSession ? 'Demo User' : (profile.displayName || session?.username || 'User');
  const headerIdentity = isDemoSession
    ? 'Hi, Demo User'
    : ((profile.title && profile.title.trim()) || (profile.displayName && profile.displayName.trim()) || session?.username || 'Nickname / Position');
  const profileEmail = isDemoSession ? 'demo@cybervault.local' : (profile.email || session?.email || '');
  const profileCreatedAt = profile.createdAt ? new Date(profile.createdAt) : new Date();
  const profileCreatedLabel = `${profileCreatedAt.toLocaleDateString()} • ${profileCreatedAt.toLocaleTimeString()}`;

  const updateProfile = (patch) => {
    setProfile(prev => ({ ...prev, ...patch }));
    setProfileNotice('Profile synced.');
    setTimeout(() => setProfileNotice(''), 1800);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showNotification('> profile.avatar.invalid.type', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        setAvatarCrop({ open: true, src: url, zoom: 1, rotation: 0, imgW: img.width, imgH: img.height });
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const saveCroppedAvatar = () => {
    if (!avatarCrop.src || !avatarCrop.imgW || !avatarCrop.imgH) {
      setAvatarCrop({ open: false, src: '', zoom: 1, rotation: 0, imgW: 0, imgH: 0 });
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const minScale = Math.max(size / avatarCrop.imgW, size / avatarCrop.imgH);
      const scale = minScale * avatarCrop.zoom;
      const drawW = avatarCrop.imgW * scale;
      const drawH = avatarCrop.imgH * scale;
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate((avatarCrop.rotation * Math.PI) / 180);
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
      const out = canvas.toDataURL('image/png');
      setProfile(prev => ({ ...prev, avatarUrl: out }));
      setProfileNotice('Avatar updated.');
      setTimeout(() => setProfileNotice(''), 1800);
      setAvatarCrop({ open: false, src: '', zoom: 1, rotation: 0, imgW: 0, imgH: 0 });
    };
    img.src = avatarCrop.src;
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

  const exportActivityLog = (events) => {
    try {
      const payload = JSON.stringify(events, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cybervault_activity_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('> activity.log.exported', 'success');
    } catch (err) {
      console.error(err);
      showNotification('> activity.log.export.failed', 'error');
    }
  };

  const regenerateRecoveryCodes = () => {
    setRecoveryCodes(buildRecoveryCodes());
    showNotification('> recovery.codes.regenerated', 'success');
  };

  const rotateDeviceId = () => {
    updateProfile({ deviceId: `CV-${randomHex(4).toUpperCase()}` });
  };

  const openConfirm = ({ title, message, confirmText, cancelText, onConfirm }) => {
    setConfirmState({
      open: true,
      title,
      message,
      confirmText: confirmText || 'Confirm',
      cancelText: cancelText || 'Cancel',
      onConfirm,
    });
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
    if (session?.demo) return;
    localStorage.setItem('threatEvents', JSON.stringify(threatEvents));
  }, [threatEvents, session?.demo]);

  useEffect(() => {
    if (session?.demo) return;
    localStorage.setItem('alertChannelEnabled', String(alertChannelEnabled));
  }, [alertChannelEnabled, session?.demo]);

  useEffect(() => {
    if (session?.demo) return;
    localStorage.setItem('activityEvents', JSON.stringify(activityEvents));
  }, [activityEvents, session?.demo]);

  useEffect(() => {
    if (session?.demo) return;
    localStorage.setItem('complianceStatus', JSON.stringify(complianceStatus));
  }, [complianceStatus, session?.demo]);

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
      if (!window.electronAPI?.saveAuditReportPdf) {
        showNotification('> audit.download.unavailable.in.web.mode', 'error');
        return;
      }
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
      if (!window.electronAPI?.saveThreatLog) {
        showNotification('> threat.log.export.unavailable.in.web.mode', 'error');
        return;
      }
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
      const irisDetector = await loadIrisDetector();
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
      const irisDetector = await loadIrisDetector();
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

  async function compareIrisTemplates(template1, template2) {
    const irisDetector = await loadIrisDetector();
    return irisDetector.compareIrisTemplates(template1, template2, 0.6);
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
      const isMatch = await compareIrisTemplates(liveIrisTemplate, stored.irisTemplate);
      
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

  async function exitDemoMode() {
    const demoEmail = session?.email || 'demo@cybervault.local';
    await clearDemoSessionArtifacts(demoEmail, files);
    clearSession();
    setProfileOpen(false);
    setMissionOpen(false);
    setDemoAccessNotice({ open: false, feature: '' });
    setPage('login');
    setMode('login');
    setLocked(false);
    setMasterPassword('');
    setLoginPassword('');
  }

  function handleRestrictedDemoFeature(feature) {
    if (!session?.demo) return;
    setDemoAccessNotice({ open: true, feature });
  }

  function logout() {
    openConfirm({
      title: 'Confirm Session Termination',
      message: 'You will be logged out and redirected to the login page.',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      onConfirm: async () => {
        if (session?.demo) {
          await exitDemoMode();
          setConfirmState(prev => ({ ...prev, open: false, onConfirm: null }));
          showNotification('> demo.session.terminated.and.cleaned', 'success');
          return;
        }
        setConfirmState(prev => ({ ...prev, open: false, onConfirm: null }));
        clearSession();
        setPage('login');
        setMode('login');
        setLocked(false);
        setTheme('night');
        localStorage.setItem('cvTheme', 'night');
        // Reset form states
        setLoginEmail('');
        setLoginPassword('');
        setSignupEmail('');
        setSignupPassword('');
        setMasterPassword('');
        setFiles([]);
        window.electronAPI?.forceRepaint?.();
      },
    });
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getActivityMeta(type) {
    switch (type) {
      case 'encrypt':
        return { label: 'Encrypt', tone: 'good' };
      case 'decrypt':
        return { label: 'Decrypt', tone: 'warn' };
      case 'backup':
        return { label: 'Backup', tone: 'good' };
      case 'restore':
        return { label: 'Restore', tone: 'warn' };
      case 'lock':
        return { label: 'Lock', tone: 'warn' };
      case 'unlock':
        return { label: 'Unlock', tone: 'good' };
      case 'tag':
        return { label: 'Tag', tone: 'neutral' };
      case 'move':
        return { label: 'Move', tone: 'warn' };
      case 'clipboard':
        return { label: 'Clipboard', tone: 'warn' };
      case 'purge':
        return { label: 'Purge', tone: 'bad' };
      case 'purge_all':
        return { label: 'Purge All', tone: 'bad' };
      default:
        return { label: 'Event', tone: 'neutral' };
    }
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
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;
    if (session?.demo) {
      if (files.length >= 1) {
        showNotification('> demo.mode.limit.reached.only.one.file.allowed', 'error');
        return;
      }
      if (incoming.length > 1) {
        showNotification('> demo.mode.allows.single.file.upload', 'error');
        return;
      }
    }
    let pwd = masterPassword;
    if (!pwd || pwd.length < 8) {
      try { pwd = await ensureMasterPassword(); } catch { showNotification('> neural.key.required.for.encryption', 'error'); return; }
    }
    setIsUploading(true);
    try {
      for (const file of incoming) {
        await new Promise(requestAnimationFrame);
        await encryptAndStoreFile(file, pwd);
      }
    } finally {
      setIsUploading(false);
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
      const dataId = `${session?.email || 'anon'}_${Date.now()}_${Math.random()}`;
      await idbPut(dataId, encryptedData);
      if (window.electronAPI?.writeVaultBlob) {
        try { await window.electronAPI.writeVaultBlob(`${dataId}.bin`, Array.from(new Uint8Array(encryptedData))); } catch {}
      }
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

  function normalizeTags(input) {
    return String(input || '')
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);
  }

  function updateFileRecord(fileId, updater) {
    setFiles(prev => prev.map(f => (f.id === fileId ? { ...f, ...updater(f) } : f)));
  }

  function promptTagFile(file) {
    if (!file) return;
    const current = Array.isArray(file.tags) && file.tags.length ? file.tags.join(', ') : '';
    const input = prompt(`Tags for ${file.name} (comma-separated)`, current);
    if (input === null) return;
    const tags = normalizeTags(input);
    updateFileRecord(file.id, () => ({ tags }));
    addActivityEvent('tag', `${file.name} tagged`);
    showNotification(`> tags.updated.${file.name}`, 'success');
  }

  function moveFileToTop(file) {
    if (!file) return;
    setFiles(prev => {
      const rest = prev.filter(f => f.id !== file.id);
      return [file, ...rest];
    });
    addActivityEvent('move', `${file.name} moved to top`);
    showNotification(`> ${file.name}.moved.to.top`, 'success');
  }

  async function viewChecksum(file) {
    if (!file) return;
    if (!file.checksum) {
      showNotification('> checksum.unavailable', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(file.checksum);
      showNotification('> checksum.copied.to.clipboard', 'success');
    } catch {
      showNotification(`> checksum.${file.checksum.slice(0, 20)}...`, 'info');
    }
  }

  async function copyToSecureClipboard(text, label) {
    try {
      await navigator.clipboard.writeText(text || '');
      setSecureClipboard({ active: true, expiresAt: Date.now() + 30000, label });
      addActivityEvent('clipboard', `${label || 'content'} copied to secure clipboard`);
      showNotification('> secure.clipboard.armed.30s', 'success');
    } catch {
      showNotification('> clipboard.unavailable', 'error');
    }
  }

  async function copyFileToSecureClipboard(file) {
    if (!file) return;
    const bytes = await decryptFileBytes(file);
    if (!bytes) return;
    const type = (file.type || '').toLowerCase();
    if (!type.startsWith('text/') && type !== 'application/json') {
      showNotification('> clipboard.copy.supports.text.files.only', 'error');
      return;
    }
    const text = new TextDecoder().decode(bytes);
    await copyToSecureClipboard(text, file.name);
  }

  async function loadFilePreview(file) {
    if (!file) return;
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewData(null);
    try {
      const bytes = await decryptFileBytes(file);
      if (!bytes) {
        setPreviewError('Unable to decrypt preview');
        return;
      }
      const rawType = (file.type || '').toLowerCase();
      const ext = String(file.name || '').split('.').pop()?.toLowerCase() || '';
      const inferredType = rawType || (
        ext === 'pdf' ? 'application/pdf'
          : ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext) ? `image/${ext === 'jpg' ? 'jpeg' : ext}`
            : ['txt', 'md', 'csv', 'json', 'xml', 'log'].includes(ext) ? 'text/plain'
              : ['mp4', 'webm', 'ogg'].includes(ext) ? `video/${ext}`
                : ['mp3', 'wav', 'ogg', 'm4a'].includes(ext) ? `audio/${ext}`
                  : 'application/octet-stream'
      );

      if (inferredType.startsWith('text/') || inferredType === 'application/json' || inferredType.includes('xml')) {
        const text = new TextDecoder().decode(bytes);
        setPreviewData({ kind: 'text', value: text.slice(0, 5000) });
        return;
      }
      if (inferredType.startsWith('image/')) {
        const blob = new Blob([bytes], { type: inferredType || 'image/png' });
        const url = URL.createObjectURL(blob);
        setPreviewData({ kind: 'image', value: url });
        return;
      }

      if (inferredType === 'application/pdf') {
        try {
          const pdfjsLib = await loadPdfJsLib();
          const pdfData = bytes?.slice ? bytes.slice(0) : new Uint8Array(bytes);
          const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1.2 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: context, viewport }).promise;
          const url = canvas.toDataURL('image/png');
          setPreviewData({ kind: 'image', value: url, note: `PDF • ${pdf.numPages} page(s)` });
          return;
        } catch {
          // Fall through to generic binary preview
        }
      }

      if (inferredType.startsWith('video/') || inferredType.startsWith('audio/')) {
        const blob = new Blob([bytes], { type: inferredType });
        const url = URL.createObjectURL(blob);
        setPreviewData({ kind: 'media', value: url, mediaType: inferredType });
        return;
      }

      // Binary fallback: show a small hex snapshot so user always sees something useful.
      const chunk = bytes.slice(0, 128);
      const hex = Array.from(chunk).map((b, i) => {
        const h = b.toString(16).padStart(2, '0');
        return `${h}${(i + 1) % 16 === 0 ? '\n' : ' '}`;
      }).join('').trim();
      setPreviewData({ kind: 'text', value: `Binary snapshot (first ${chunk.length} bytes)\n\n${hex}` });
    } catch (err) {
      console.error(err);
      setPreviewError('Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  }

  const recommendExportFormat = (file) => {
    const t = (file?.type || '').toLowerCase();
    if (t.startsWith('image/')) return 'img';
    if (t === 'application/pdf') return 'pdf';
    if (t.startsWith('text/')) return 'text';
    return 'pdf';
  };

  const openExportModal = (file) => {
    setExportState({ open: true, file, recommended: recommendExportFormat(file) });
  };

  const getBaseName = (name) => {
    const idx = name.lastIndexOf('.');
    return idx > 0 ? name.slice(0, idx) : name;
  };

  async function decryptFileBytes(file) {
    let pwd = masterPassword;
    if (!pwd || pwd.length < 8) { try { pwd = await ensureMasterPassword(); } catch { showNotification('> neural.key.required.for.decryption', 'error'); return null; } }
    try {
      const key = await deriveQuantumKey(pwd, new Uint8Array(file.salt));
      const ciphertext = await getEncryptedBytes(file);
      if (!ciphertext) throw new Error('missing.encrypted.payload');
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(file.iv) },
        key,
        ciphertext
      );
      const checksum = await generateChecksum(decrypted);
      if (checksum !== file.checksum) throw new Error('File integrity verification failed');
      return decrypted;
    } catch (err) {
      console.error(err);
      addThreatEvent('decrypt_failed', err.message || 'decrypt_failed');
      if (err.name === 'OperationError') showNotification('> decryption.failed.invalid.neural.key', 'error');
      else showNotification(`> decryption.failed.${err.message}`, 'error');
      return null;
    }
  }

  async function downloadFile(fileId) {
    try {
      const file = files.find(f => f.id === fileId);
      if (!file) { showNotification('> file.not.found.in.neural.network', 'error'); return; }
      showNotification(`> decrypting.${file.name}`, 'info');
      const decrypted = await decryptFileBytes(file);
      if (!decrypted) return;
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

  async function exportFileToSystem(file, format) {
    if (!file) return;
    const decrypted = await decryptFileBytes(file);
    if (!decrypted) return;
    const type = (file.type || '').toLowerCase();
    const base = getBaseName(file.name);
    if (format === 'text') {
      const text = new TextDecoder().decode(decrypted);
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${base}.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      showNotification(`> ${base}.txt.exported`, 'success');
      return;
    }
    if (format === 'img') {
      if (!type.startsWith('image/')) { showNotification('> export.format.not.compatible.recommended.image', 'error'); return; }
      const blob = new Blob([decrypted], { type: file.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      showNotification(`> ${file.name}.exported`, 'success');
      return;
    }
    if (format === 'pdf') {
      if (type !== 'application/pdf') { showNotification('> export.format.not.compatible.recommended.pdf', 'error'); return; }
      const blob = new Blob([decrypted], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file.name.endsWith('.pdf') ? file.name : `${base}.pdf`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      showNotification(`> ${base}.pdf.exported`, 'success');
    }
  }

  async function deleteFile(fileId) {
    const f = files.find(f => f.id === fileId);
    if (!f) return;
    openConfirm({
      title: 'Confirm File Purge',
      message: `"${f.name}" will be permanently removed from the vault.`,
      confirmText: 'Purge',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try { if (f.dataId) await idbDelete(f.dataId); } catch {}
        if (f.dataId && window.electronAPI?.deleteVaultBlob) {
          try { await window.electronAPI.deleteVaultBlob(`${f.dataId}.bin`); } catch {}
        }
        setFiles(prev => prev.filter(x => x.id !== fileId));
        addActivityEvent('purge', `${f.name} purged`);
        showNotification(`> ${f.name}.purged.from.neural.network`, 'success');
        setConfirmState(prev => ({ ...prev, open: false }));
      },
    });
  }

  async function clearAllFiles() {
    openConfirm({
      title: 'Confirm Total Purge',
      message: 'This will permanently delete ALL encrypted files in the vault.',
      confirmText: 'Continue',
      cancelText: 'Cancel',
      onConfirm: () => {
        openConfirm({
          title: 'Final Confirmation',
          message: 'This action is irreversible. Purge all vault data now?',
          confirmText: 'Purge All',
          cancelText: 'Cancel',
          onConfirm: async () => {
            try {
              for (const f of files) {
                if (f.dataId) await idbDelete(f.dataId);
                if (f.dataId && window.electronAPI?.deleteVaultBlob) {
                  try { await window.electronAPI.deleteVaultBlob(`${f.dataId}.bin`); } catch {}
                }
              }
            } catch {}
            const keys = filesLegacyKeysFor(session?.email);
            for (const key of keys) {
              localStorage.removeItem(key);
              try { await idbDeleteMeta(key); } catch {}
            }
            setFiles([]);
            addActivityEvent('purge_all', 'All files purged');
            showNotification('> neural.network.purged.successfully', 'success');
            setConfirmState(prev => ({ ...prev, open: false }));
          },
        });
      },
    });
  }

  async function backupVault() {
    try {
      let pwd = masterPassword;
      if (!pwd || pwd.length < 8) { try { pwd = await ensureMasterPassword(); } catch { showNotification('> neural.key.required.for.backup', 'error'); return; } }
      const filesForBackup = await Promise.all(files.map(async f => {
        const out = { ...f };
        const ct = await getEncryptedBytes(f);
        if (!ct) throw new Error('missing.encrypted.payload');
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
            const dataId = `${session?.email || 'anon'}_${Date.now()}_${Math.random()}`;
            const encBytes = new Uint8Array(rf.encryptedData);
            await idbPut(dataId, encBytes);
            if (window.electronAPI?.writeVaultBlob) {
              try { await window.electronAPI.writeVaultBlob(`${dataId}.bin`, Array.from(encBytes)); } catch {}
            }
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
    if (session?.demo) {
      setLocked(false);
      setLockInput('');
      showNotification('> demo.session.unlocked', 'success');
      return;
    }
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
      const isMatch = await compareIrisTemplates(liveIrisTemplate, stored.irisTemplate);
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
  const isStorageEmpty = fileCount === 0;

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
  const totalTypeBytes = Object.values(typeStats).reduce((a, b) => a + b, 0);
  const hasTypeBytes = totalTypeBytes > 0;
  const pctDocs = hasTypeBytes ? Math.round((typeStats.docs / totalTypeBytes) * 100) : 0;
  const pctMedia = hasTypeBytes ? Math.round((typeStats.media / totalTypeBytes) * 100) : 0;
  const pctArchives = hasTypeBytes ? Math.round((typeStats.archives / totalTypeBytes) * 100) : 0;
  const pctOther = hasTypeBytes ? Math.max(0, 100 - pctDocs - pctMedia - pctArchives) : 0;
  const pctStops = {
    '--a': pctDocs,
    '--ab': pctDocs + pctMedia,
    '--abc': pctDocs + pctMedia + pctArchives
  };

  const storageSnapshot = useMemo(() => {
    const largest = files.reduce((acc, f) => (f.size || 0) > (acc?.size || 0) ? f : acc, null);
    const lastBackup = activityEvents.find(e => e.type === 'backup');
    const lastRestore = activityEvents.find(e => e.type === 'restore');
    return { largest, lastBackup, lastRestore };
  }, [files, activityEvents]);

  const storageTrend = useMemo(() => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Array.from({ length: 7 }).map((_, i) => {
      const day = new Date(base);
      day.setDate(base.getDate() - (6 - i));
      const start = day.getTime();
      const end = start + 24 * 60 * 60 * 1000;
      const count = files.filter(f => {
        const t = new Date(f.uploadDate || f.createdAt || f.at || 0).getTime();
        return t >= start && t < end;
      }).length;
      return {
        label: day.toLocaleDateString(undefined, { weekday: 'short' }),
        count
      };
    });
    const max = Math.max(1, ...days.map(d => d.count));
    return { days, max };
  }, [files]);

  const complianceSnapshot = useMemo(() => {
    const now = Date.now();
    const statusFor = (iso) => {
      if (!iso) return { label: 'Not run', tone: 'bad', days: null };
      const days = Math.floor((now - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 30) return { label: `OK • ${days}d`, tone: 'good', days };
      if (days <= 90) return { label: `Due • ${days}d`, tone: 'warn', days };
      return { label: `Overdue • ${days}d`, tone: 'bad', days };
    };
    return {
      gdpr: statusFor(complianceStatus.gdpr),
      hipaa: statusFor(complianceStatus.hipaa),
      soc2: statusFor(complianceStatus.soc2),
    };
  }, [complianceStatus]);

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
    return files.filter((f) => {
      const tagHit = Array.isArray(f.tags) && f.tags.some(tag => String(tag).toLowerCase().includes(q));
      return f.name.toLowerCase().includes(q) || tagHit;
    });
  }, [files, query]);

  const selectedFile = useMemo(() => files.find(f => f.id === selectedFileId) || null, [files, selectedFileId]);

  const pulseDeck = useMemo(() => {
    const now = Date.now();
    const windows = Array.from({ length: 12 }).map((_, idx) => {
      const from = now - (11 - idx) * 2 * 60 * 60 * 1000;
      const to = from + 2 * 60 * 60 * 1000;
      const count = activityEvents.filter((e) => {
        const t = new Date(e.at).getTime();
        return t >= from && t < to;
      }).length;
      return count;
    });
    const max = Math.max(1, ...windows);
    const latest = activityEvents[0] || null;
    const recentBackups = activityEvents.filter(e => e.type === 'backup' && (now - new Date(e.at).getTime()) < 7 * 24 * 60 * 60 * 1000).length;
    const recentRestores = activityEvents.filter(e => e.type === 'restore' && (now - new Date(e.at).getTime()) < 7 * 24 * 60 * 60 * 1000).length;
    const latestBackupAt = activityEvents
      .filter(e => e.type === 'backup')
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0]?.at || null;
    const pendingBackupCount = latestBackupAt
      ? files.filter(f => new Date(f.uploadDate || 0).getTime() > new Date(latestBackupAt).getTime()).length
      : files.length;
    const activitySum = windows.reduce((a, b) => a + b, 0);
    const syncScore = Math.max(35, Math.min(99, 55 + Math.round(activitySum * 1.8) + Math.min(14, fileCount)));
    const nextAction = pendingBackupCount > 0
      ? `Backup ${pendingBackupCount} new file${pendingBackupCount === 1 ? '' : 's'}`
      : recentBackups === 0
        ? 'Create first backup snapshot'
        : 'Vault snapshot is up to date';
    return { windows, max, latest, recentBackups, recentRestores, pendingBackupCount, nextAction, syncScore };
  }, [activityEvents, files, fileCount]);

  useEffect(() => {
    if (files.length === 0) {
      setSelectedFileId(null);
      setPreviewData(null);
      setPreviewError('');
    }
  }, [files]);

  useEffect(() => {
    if (!selectedFile || !previewOpen) return;
    loadFilePreview(selectedFile);
  }, [selectedFileId, previewOpen]);

  useEffect(() => {
    return () => {
      if ((previewData?.kind === 'image' || previewData?.kind === 'media') && previewData.value) {
        try { URL.revokeObjectURL(previewData.value); } catch {}
      }
    };
  }, [previewData]);

  const securityMetrics = useMemo(() => {
    const now = Date.now();
    const storedUser = session?.email ? JSON.parse(localStorage.getItem('neuralUser_' + session.email) || '{}') : {};
    const biometricCount = [storedUser?.faceDescriptor, storedUser?.irisTemplate, storedUser?.fingerprintEnabled].filter(Boolean).length;
    const latestBackup = activityEvents
      .filter(e => e.type === 'backup')
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0];
    const backupAgeHours = latestBackup ? (now - new Date(latestBackup.at).getTime()) / (1000 * 60 * 60) : null;
    let score = 60;
    score += Math.min(15, Math.round(entropyScore * 2));
    if (autoLockEnabled) score += 5;
    if (backupAgeHours === null) score -= 5;
    else if (backupAgeHours < 24) score += 10;
    else if (backupAgeHours < 72) score += 5;
    else score -= 5;
    if (biometricCount >= 2) score += 8;
    else if (biometricCount === 1) score += 4;
    score = Math.max(0, Math.min(100, score));

    const riskStatus = {
      backup: backupAgeHours === null ? 'bad' : backupAgeHours < 24 ? 'good' : backupAgeHours < 72 ? 'warn' : 'bad',
      biometric: biometricCount >= 2 ? 'good' : biometricCount === 1 ? 'warn' : 'bad',
      autolock: autoLockEnabled ? 'good' : 'warn',
    };

    const anomalies24h = threatEvents.filter(e => now - new Date(e.at).getTime() < 24 * 60 * 60 * 1000);
    const anomalyStatus = anomalies24h.length === 0 ? 'good' : anomalies24h.length < 3 ? 'warn' : 'bad';

    const heatbars = Array.from({ length: 7 }).map((_, i) => {
      const from = now - (6 - i) * 24 * 60 * 60 * 1000;
      const to = from + 24 * 60 * 60 * 1000;
      return activityEvents.filter(e => {
        const t = new Date(e.at).getTime();
        return t >= from && t < to;
      }).length;
    });

    return { score, biometricCount, backupAgeHours, riskStatus, anomalyStatus, anomalies24h: anomalies24h.length, heatbars };
  }, [activityEvents, threatEvents, entropyScore, autoLockEnabled, session?.email]);

  const activityFiltered = useMemo(() => {
    const now = Date.now();
    const rangeMs = activityRange === '24h'
      ? 24 * 60 * 60 * 1000
      : activityRange === '7d'
        ? 7 * 24 * 60 * 60 * 1000
        : activityRange === '30d'
          ? 30 * 24 * 60 * 60 * 1000
          : Infinity;
    return activityEvents.filter((event) => {
      const t = new Date(event.at).getTime();
      if (rangeMs !== Infinity && now - t > rangeMs) return false;
      if (activityType !== 'all' && event.type !== activityType) return false;
      if (activityQuery) {
        const q = activityQuery.toLowerCase();
        const hay = `${event.type} ${event.detail || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activityEvents, activityRange, activityType, activityQuery]);

  const activitySummary = useMemo(() => {
    const byType = activityFiltered.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});
    const latest = activityFiltered[0];
    const lastBackup = activityFiltered.find(e => e.type === 'backup') || activityEvents.find(e => e.type === 'backup');
    const lastRestore = activityFiltered.find(e => e.type === 'restore') || activityEvents.find(e => e.type === 'restore');
    return {
      total: activityFiltered.length,
      byType,
      latest,
      lastBackup,
      lastRestore,
    };
  }, [activityFiltered, activityEvents]);

  const threatSummary = useMemo(() => {
    const now = Date.now();
    const last24h = threatEvents.filter(e => now - new Date(e.at).getTime() < 24 * 60 * 60 * 1000);
    const unlockFailed = last24h.filter(e => e.type === 'unlock_failed').length;
    const decryptFailed = last24h.filter(e => e.type === 'decrypt_failed').length;
    const manualLocks = last24h.filter(e => e.type === 'manual_lock').length;
    const total = last24h.length;
    const topTrigger = unlockFailed >= decryptFailed && unlockFailed >= manualLocks
      ? 'Unlock Failures'
      : decryptFailed >= manualLocks
        ? 'Decrypt Failures'
        : 'Manual Locks';
    const heat = [
      { label: 'Unlock', value: unlockFailed },
      { label: 'Decrypt', value: decryptFailed },
      { label: 'Lock', value: manualLocks },
      { label: 'Other', value: Math.max(0, total - unlockFailed - decryptFailed - manualLocks) },
    ];
    return { total, unlockFailed, decryptFailed, manualLocks, topTrigger, heat, last24h };
  }, [threatEvents]);

  const recentAnomalies = useMemo(() => {
    const now = Date.now();
    return threatEvents
      .filter(e => now - new Date(e.at).getTime() < 24 * 60 * 60 * 1000)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [threatEvents]);

  const neuralPinConfigured = useMemo(() => {
    if (!session?.email) return false;
    try {
      const storedUser = JSON.parse(localStorage.getItem('neuralUser_' + session.email) || '{}');
      return Boolean(storedUser.neuralPin);
    } catch {
      return false;
    }
  }, [session?.email]);

  useEffect(() => {
    if (activePanel !== 'security') {
      setAnomalyPin('');
      setAnomalyUnlocked(false);
      setAnomalyInfo({ open: false, event: null });
    }
  }, [activePanel]);

  useEffect(() => {
    let cancelled = false;
    async function renderPdfPages() {
      if (!viewingFileContent || viewingFileContent.kind !== 'pdf') {
        if (!cancelled) {
          setPdfRenderState('idle');
          setPdfPageImages([]);
        }
        return;
      }
      setPdfRenderState('loading');
      try {
        const pdfjsLib = await loadPdfJsLib();
        const src = viewingFileContent.data;
        // pdf.js transfers the ArrayBuffer to the worker; clone to avoid "detached" errors on re-render.
        const pdfData = src?.slice ? src.slice(0) : new Uint8Array(src);
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const pages = [];
        const renderPage = async (pageNum) => {
          const page = await pdf.getPage(pageNum);
          const dpr = window.devicePixelRatio || 1;
          const hdBoost = pdfHd ? 1.5 : 1;
          let scale = pdfScale * dpr * hdBoost;
          let viewport = page.getViewport({ scale });
          const MAX_DIM = 4096;
          const MAX_AREA = 16_000_000;
          const maxDim = Math.max(viewport.width, viewport.height);
          if (maxDim > MAX_DIM) {
            scale *= MAX_DIM / maxDim;
            viewport = page.getViewport({ scale });
          }
          if (viewport.width * viewport.height > MAX_AREA) {
            scale *= Math.sqrt(MAX_AREA / (viewport.width * viewport.height));
            viewport = page.getViewport({ scale });
          }
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: context, viewport }).promise;
          return canvas.toDataURL('image/png');
        };
        // Render first page fast for quick preview
        const first = await renderPage(1);
        pages.push(first);
        if (!cancelled) {
          setPdfPageImages([...pages]);
          setPdfRenderState('ready');
        }
        // Lazy render remaining pages
        for (let i = 2; i <= pdf.numPages; i += 1) {
          if (cancelled) break;
          await new Promise(resolve => (window.requestIdleCallback ? window.requestIdleCallback(resolve, { timeout: 400 }) : setTimeout(resolve, 60)));
          const img = await renderPage(i);
          pages.push(img);
          if (!cancelled) {
            setPdfPageImages([...pages]);
          }
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setPdfRenderState('error');
          setPdfPageImages([]);
        }
      }
    }
    renderPdfPages();
    return () => {
      cancelled = true;
    };
  }, [viewingFileContent, pdfScale, pdfHd]);

  useEffect(() => {
    function onFullscreenChange() {
      setViewerFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Avoid re-rendering heavy PDF canvases on fullscreen toggle to keep transition smooth.

  function selectFileForPreview(file) {
    setSelectedFileId(file.id);
    setPreviewOpen(true);
  }

  function onFileContextMenu(e, file) {
    e.preventDefault();
    setSelectedFileId(file.id);
    setContextMenu({
      open: true,
      x: e.clientX,
      y: e.clientY,
      file
    });
  }

  function openFileViewer(file) {
    setViewingFile(file);
    setViewingFileContent(null);
    setViewingFilePin('');
  }

  function closeFileViewer() {
    if (viewingFileContent?.kind === 'url') {
      try { URL.revokeObjectURL(viewingFileContent.url); } catch {}
    }
    setViewerFullscreen(false);
    setViewingFile(null);
    setViewingFileContent(null);
    setPdfPageImages([]);
  }

  function toggleFileViewerFullscreen() {
    setViewerFullscreen(v => !v);
  }

  function unlockAnomalyDetails() {
    if (!session?.email) return;
    let storedUser = {};
    try { storedUser = JSON.parse(localStorage.getItem('neuralUser_' + session.email) || '{}'); } catch {}
    if (!storedUser.neuralPin) {
      showNotification('> neural.pin.not.set', 'error');
      return;
    }
    if (storedUser.neuralPin !== anomalyPin) {
      showNotification('> invalid.neural.pin', 'error');
      setAnomalyUnlocked(false);
      return;
    }
    setAnomalyUnlocked(true);
    showNotification('> anomaly.view.unlocked', 'success');
  }

  function getAnomalyInfo(event) {
    const type = event?.type || '';
    const detail = event?.detail || '';
    if (type === 'unlock_failed') {
      return {
        title: 'Failed Unlock Attempts',
        body: 'One or more unlock attempts failed in the last 24 hours. This could indicate a forgotten pin, a mistyped key, or an unauthorized access attempt. Review recent activity and consider rotating your neural pin if this continues.'
      };
    }
    if (type === 'decrypt_failed') {
      return {
        title: 'Decryption Failure',
        body: 'A file decryption operation failed. This may happen with a wrong neural key, corrupted ciphertext, or interrupted process. Verify the key health and re-run integrity checks.'
      };
    }
    if (type === 'manual_lock') {
      return {
        title: 'Manual Lock Triggered',
        body: 'The vault was manually locked. Frequent manual locks can be normal during sensitive operations, but repeated locks may also indicate suspicious activity.'
      };
    }
    if (detail) {
      return {
        title: 'Anomaly Detected',
        body: detail
      };
    }
    return {
      title: 'Anomaly Detected',
      body: 'An unusual event was recorded. Review the activity timeline and run a full audit for deeper verification.'
    };
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
      const ciphertext = await getEncryptedBytes(viewingFile);
      if (!ciphertext) throw new Error('missing.encrypted.payload');
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(viewingFile.iv) },
        key,
        ciphertext
      );
      const checksum = await generateChecksum(decrypted);
      if (checksum !== viewingFile.checksum) throw new Error('File integrity verification failed');
      
      const fileType = viewingFile.type || 'application/octet-stream';
      if (fileType === 'application/pdf') {
        setViewingFileContent({ kind: 'pdf', data: new Uint8Array(decrypted) });
      } else {
        const blob = new Blob([decrypted], { type: fileType });
        setViewingFileContent({ kind: 'url', url: URL.createObjectURL(blob) });
      }

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
      return <img src={viewingFileContent.url} alt={viewingFile.name} className="file-view-media image" />;
    }

    if (type.startsWith('text/')) {
      return <iframe src={viewingFileContent.url} className="file-view-media frame" />;
    }

    if (type === 'application/pdf') {
      return (
        <div className="file-view-pdf">
          <div
            className="file-view-pdf-inner"
            style={{
              transform: `scale(${pdfViewZoom})`,
              transformOrigin: 'top center'
            }}
          >
            {pdfRenderState === 'loading' && <div className="file-view-loading">Rendering PDF…</div>}
            {pdfRenderState === 'error' && <div className="file-view-loading">PDF preview failed.</div>}
            {pdfRenderState === 'ready' && pdfPageImages.map((src, idx) => (
              <img key={idx} src={src} alt={`Page ${idx + 1}`} className="file-view-pdf-page" />
            ))}
          </div>
        </div>
      );
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
        <Welcome onLogin={handleGoToLogin} onSignup={handleGoToSignup} onDemo={startDemoMode} />
      )}

      {page === 'login' && (
        <div className="login-page" id="loginPage">
          <button
            type="button"
            className="back-to-welcome-btn"
            onClick={() => setPage('welcome')}
          >
            <span className="back-icon" aria-hidden="true">{'\u2302'}</span>
            <span>You wanna go back?</span>
          </button>

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
                      <button type="button" className="cyber-btn btn-primary" style={{ flex: '1 1 auto', minWidth: '80px' }} onClick={handleFaceLogin}>🙂 Face</button>
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
                    <input type="password" className="form-input" id="confirmPassword" placeholder="Confirm quantum passphrase..." required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={confirmPassword ? (confirmPassword !== signupPassword ? { borderColor: '#ff4d4f', boxShadow: '0 0 10px rgba(255, 77, 79, 0.3)' } : { borderColor: '#ff9f43', boxShadow: '0 0 10px rgba(255, 159, 67, 0.35)' }) : {}} />
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
                    <div className="password-status" style={/^\d{3}$/.test(signupNeuralPin) ? {color: '#ffb26f'} : {color: '#ff4d4f'}}>
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
                  {session?.demo && <div className="demo-session-pill">Demo Mode • 1 file limit</div>}
                </div>
                <div className="header-actions">
                  <button
                    className="cyber-btn btn-secondary"
                    onClick={() => (session?.demo ? handleRestrictedDemoFeature('Mission Control') : setMissionOpen(true))}
                    aria-label="Open Mission Mode"
                  >
                    🎯 Missions
                  </button>
                  <button
                    className="profile-badge"
                    onClick={() => (session?.demo ? handleRestrictedDemoFeature('Profile Center') : setProfileOpen(true))}
                    aria-label="Open profile settings"
                  >
                    <span className="profile-avatar" style={{ '--accent': profile.accent }}>
                      {profile.avatarUrl ? (
                        <img className="profile-avatar-img" src={profile.avatarUrl} alt={profileDisplayName} />
                      ) : (
                        profileDisplayName.charAt(0).toUpperCase()
                      )}
                    </span>
                    <span className="profile-tooltip">
                      <span className="profile-tooltip-name">{profileDisplayName}</span>
                      <span className="profile-tooltip-role">{session?.demo ? 'Guest Trial Session' : profile.title}</span>
                    </span>
                  </button>
                  <button className="logout-btn" onClick={logout}>Logout</button>
                </div>
              </div>
              <div className="header-search-row">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="password-input header-search"
                  placeholder="Global search files + tags... (Ctrl/Cmd+F)"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
                <button className="cyber-btn btn-secondary" onClick={() => setPreviewOpen(v => !v)}>
                  {previewOpen ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>
              <div className="header-status">
                <div className="greeting-status-glow" aria-hidden="true"></div>
                <div className="greeting-title-row">
                  <div className="greeting-title">{headerIdentity}</div>
                  <span className="greeting-caret" aria-hidden="true">⚡</span>
                </div>
                <div className="greeting-subtitle">Vault Ready • Shield Active • Zero-Trust</div>
                <div className="greeting-rail" aria-hidden="true"><span></span></div>
                {secureClipboard.active && (
                  <div className="secure-clipboard-pill">
                    Secure Clipboard: {secureClipboard.label} • {Math.max(0, Math.ceil((secureClipboard.expiresAt - Date.now()) / 1000))}s
                  </div>
                )}
              </div>
            </div>

            <div className={`main-grid ${previewOpen ? 'has-preview' : ''}`}>
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
                    <input type="text" className="password-input sidebar-text" placeholder="Filter by name or tag..." value={query} onChange={e => setQuery(e.target.value)} />
                  </div>
                </div>
                <button className="cyber-btn btn-danger sidebar-action" data-label="Purge All Data" onClick={clearAllFiles} style={{ width: '100%', marginTop: 10 }}>
                  <span className="action-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" className="action-icon-svg">
                      <path d="M12 2a7 7 0 0 0-7 7v3a4 4 0 0 0 3 3.87V18a4 4 0 0 0 8 0v-2.13A4 4 0 0 0 19 12V9a7 7 0 0 0-7-7Zm-4 8a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm8 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-6 9a2 2 0 0 1 4 0v1h-4v-1Z" />
                    </svg>
                  </span>
                  <span className="action-label sidebar-text">Purge All Data</span>
                </button>
              </div>

              <div className="main-content">
                <div className={`upload-zone ${isUploading ? 'uploading' : ''}`} onClick={() => fileInputRef.current?.click()} onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }} onDragLeave={e => e.currentTarget.classList.remove('dragover')} onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); handleFiles(e.dataTransfer.files); }}>
                  <div className="upload-icon upload-icon-text" aria-hidden="true">
                    UPLOAD
                  </div>
                  <div className="upload-text">Neural Upload Interface</div>
                  <div className="upload-subtext">&gt; drag.files || click.to.encrypt</div>
                  <div className="upload-tags">
                    <span className="upload-tag">AES-256</span>
                    <span className="upload-tag">Zero Knowledge</span>
                    <span className="upload-tag">Biometric Ready</span>
                  </div>
                  {isUploading && <div className="uploading-hint">Encrypting files…</div>}
                  <input type="file" id="fileInput" ref={fileInputRef} multiple={!session?.demo} onChange={e => handleFiles(e.target.files)} />
                </div>

                <div className="pulse-deck">
                  <div className="pulse-left">
                    <div className="pulse-title">Neural Pulse Deck</div>
                    <div className="pulse-subtitle">Live vault rhythm, trust sync, and hot signals</div>
                    <div className="pulse-wave">
                      {pulseDeck.windows.map((v, i) => (
                        <span
                          key={i}
                          style={{ height: `${Math.max(8, Math.round((v / pulseDeck.max) * 100))}%` }}
                        ></span>
                      ))}
                    </div>
                    <div className="pulse-legend">Last 24h activity stream (2h slices)</div>
                  </div>
                  <div className="pulse-right">
                    <div className="pulse-ring" style={{ '--pct': `${pulseDeck.syncScore}%` }}>
                      <div className="pulse-ring-value">{pulseDeck.syncScore}</div>
                      <div className="pulse-ring-label">SYNC</div>
                    </div>
                    <div className="pulse-kpis">
                      <div className="pulse-kpi">
                        <span>Latest Event</span>
                        <b>{pulseDeck.latest ? pulseDeck.latest.detail : 'No recent activity'}</b>
                      </div>
                      <div className="pulse-kpi">
                        <span>Backups / 7d</span>
                        <b>{pulseDeck.recentBackups}</b>
                      </div>
                      <div className="pulse-kpi">
                        <span>Restores / 7d</span>
                        <b>{pulseDeck.recentRestores}</b>
                      </div>
                      <div className="pulse-kpi">
                        <span>Next Action</span>
                        <b>{pulseDeck.nextAction}</b>
                      </div>
                    </div>
                  </div>
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
                      <div
                        className={`file-card fade-in ${selectedFileId === file.id ? 'selected' : ''}`}
                        key={file.id}
                        onClick={() => selectFileForPreview(file)}
                        onContextMenu={(e) => onFileContextMenu(e, file)}
                      >
                        <div className="file-icon">{getFileIcon(file.type)}</div>
                        <div className="file-name">{file.name}</div>
                        <div className="file-info">
                          {formatFileSize(file.size)} • {new Date(file.uploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          <br />
                          <span style={{ color: 'var(--primary-cyan)', fontSize: 10 }}>ENCRYPTED • AES-256-GCM</span>
                          <br />
                          <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>ID: {String(file.id).slice(-8)}</span>
                        </div>
                        {Array.isArray(file.tags) && file.tags.length > 0 && (
                          <div className="file-tags">{file.tags.map(tag => <span key={`${file.id}-${tag}`} className="file-tag">{tag}</span>)}</div>
                        )}
                        <div className="file-actions">
                          <button className="cyber-btn btn-secondary" onClick={(e) => { e.stopPropagation(); openFileViewer(file); }} title="View file">👁️ View</button>
                          <button className="cyber-btn btn-secondary" onClick={(e) => { e.stopPropagation(); openExportModal(file); }} title="Export to system">⬇️ Export</button>
                          <button className="cyber-btn btn-danger" onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }} title="Permanently delete file">🗑️ Purge</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {previewOpen && (
                <aside className="preview-panel">
                  <div className="preview-header">
                    <div className="preview-title">File Preview</div>
                    <button className="cyber-btn btn-secondary" onClick={() => setPreviewOpen(false)}>Close</button>
                  </div>
                  {!selectedFile ? (
                    <div className="preview-empty">Select a file to inspect metadata and preview.</div>
                  ) : (
                    <div className="preview-body">
                      <div className="preview-meta">
                        <div><span>Name</span><b>{selectedFile.name}</b></div>
                        <div><span>Size</span><b>{formatFileSize(selectedFile.size)}</b></div>
                        <div><span>Date Added</span><b>{new Date(selectedFile.uploadDate).toLocaleString()}</b></div>
                        <div><span>Checksum</span><b className="mono">{selectedFile.checksum?.slice(0, 20)}...</b></div>
                        <div><span>Tags</span><b>{(selectedFile.tags || []).join(', ') || 'none'}</b></div>
                      </div>
                      <div className="preview-actions">
                        <button className="cyber-btn btn-secondary" onClick={() => promptTagFile(selectedFile)}>Tag</button>
                        <button className="cyber-btn btn-secondary" onClick={() => openExportModal(selectedFile)}>Export</button>
                        <button className="cyber-btn btn-secondary" onClick={() => copyFileToSecureClipboard(selectedFile)}>Copy</button>
                        <button className="cyber-btn btn-secondary" onClick={() => viewChecksum(selectedFile)}>Checksum</button>
                      </div>
                      <div className="preview-content">
                        {previewLoading && <div className="preview-empty">Loading preview...</div>}
                        {!previewLoading && previewError && <div className="preview-empty">{previewError}</div>}
                        {!previewLoading && !previewError && previewData?.kind === 'text' && <pre>{previewData.value}</pre>}
                        {!previewLoading && !previewError && previewData?.kind === 'image' && (
                          <div>
                            {previewData?.note && <div className="preview-note">{previewData.note}</div>}
                            <img src={previewData.value} alt={selectedFile.name} />
                          </div>
                        )}
                        {!previewLoading && !previewError && previewData?.kind === 'media' && previewData.mediaType?.startsWith('video/') && (
                          <video className="preview-media" src={previewData.value} controls />
                        )}
                        {!previewLoading && !previewError && previewData?.kind === 'media' && previewData.mediaType?.startsWith('audio/') && (
                          <audio className="preview-media" src={previewData.value} controls />
                        )}
                        {!previewLoading && !previewError && previewData?.kind === 'meta' && <div className="preview-empty">{previewData.value}</div>}
                      </div>
                    </div>
                  )}
                </aside>
              )}
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
                  <div className="security-overview">
                    <div className="shield-gauge" style={{ '--pct': `${securityMetrics.score}%` }}>
                      <div className="shield-score">{securityMetrics.score}</div>
                      <div className="shield-label">Vault Health</div>
                    </div>
                    <div className="heatbar">
                      <div className="heatbar-title">Activity Heat</div>
                      <div className="heatbar-bars">
                        {securityMetrics.heatbars.map((v, i) => (
                          <span key={i} className="heatbar-bar" style={{ height: `${Math.min(100, 20 + v * 12)}%` }}></span>
                        ))}
                      </div>
                      <div className="heatbar-legend">7-day activity</div>
                    </div>
                    <div className="anomaly-snapshot">
                      <div className="anomaly-title">Anomaly Snapshot</div>
                      <div className={`anomaly-count ${securityMetrics.anomalyStatus}`}>{securityMetrics.anomalies24h}</div>
                      <div className="anomaly-note">Events in last 24h</div>
                    </div>
                  </div>
                  <div className="risk-grid">
                    <div className={`risk-card ${securityMetrics.riskStatus.backup}`}>
                      <div className="risk-label">Backup Freshness</div>
                      <div className="risk-value">
                        {securityMetrics.backupAgeHours === null ? 'No backup' : `${Math.round(securityMetrics.backupAgeHours)}h ago`}
                      </div>
                    </div>
                    <div className={`risk-card ${securityMetrics.riskStatus.biometric}`}>
                      <div className="risk-label">Biometric Coverage</div>
                      <div className="risk-value">{securityMetrics.biometricCount} factors</div>
                    </div>
                    <div className={`risk-card ${securityMetrics.riskStatus.autolock}`}>
                      <div className="risk-label">Auto-Lock</div>
                      <div className="risk-value">{autoLockEnabled ? 'Enabled' : 'Disabled'}</div>
                    </div>
                    <div className={`risk-card ${securityMetrics.anomalyStatus}`}>
                      <div className="risk-label">Anomalies</div>
                      <div className="risk-value">{securityMetrics.anomalies24h} alerts</div>
                    </div>
                  </div>
                  <div className="drawer-card anomaly-details">
                    <div className="drawer-label">Anomaly Details</div>
                    <div className="drawer-help">Unlock with your neural pin to review anomaly events from the last 24 hours.</div>
                    {!anomalyUnlocked ? (
                      <div className="anomaly-gate">
                        <input
                          type="password"
                          className="drawer-input"
                          placeholder="Enter neural pin"
                          value={anomalyPin}
                          onChange={(e) => setAnomalyPin(e.target.value)}
                          disabled={!neuralPinConfigured}
                        />
                        <button className="drawer-btn" onClick={unlockAnomalyDetails} disabled={!neuralPinConfigured || !anomalyPin}>
                          Unlock
                        </button>
                        {!neuralPinConfigured && (
                          <div className="drawer-note">Set a neural pin in Profile Settings to unlock anomaly details.</div>
                        )}
                      </div>
                    ) : (
                      <div className="anomaly-list">
                        {recentAnomalies.length === 0 ? (
                          <div className="drawer-value">No anomalies detected in the last 24 hours.</div>
                        ) : (
                          recentAnomalies.slice(0, 6).map((event, idx) => (
                            <div key={event.id || `${event.at}-${idx}`} className="anomaly-item">
                              <div>
                                <div className="anomaly-item-title">{event.detail || event.type || 'Anomaly detected'}</div>
                                <div className="anomaly-item-sub">{new Date(event.at).toLocaleString()}</div>
                              </div>
                              <div className="anomaly-actions">
                                <span className={`anomaly-badge ${securityMetrics.anomalyStatus}`}>
                                  {securityMetrics.anomalyStatus === 'good' ? 'LOW' : securityMetrics.anomalyStatus === 'warn' ? 'MED' : 'HIGH'}
                                </span>
                                <button
                                  type="button"
                                  className="anomaly-info-btn"
                                  onClick={() => setAnomalyInfo({ open: true, event })}
                                  aria-label="Anomaly details"
                                  title="Anomaly details"
                                >
                                  i
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
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
                  <div className="drawer-card activity-command">
                    <div className="command-header">
                      <div className="command-title">Activity Command Deck</div>
                      <div className="command-sub">Live ops actions + smart lenses for your vault.</div>
                    </div>
                    <div className="command-actions">
                      <button className="drawer-btn" onClick={backupVault}>Backup Now</button>
                      <button className="drawer-btn" onClick={() => exportActivityLog(activityFiltered)} disabled={activityFiltered.length === 0}>Export Log</button>
                      <button className="drawer-btn" onClick={manualLock}>Lock Vault</button>
                      <button className="drawer-btn" onClick={() => openConfirm({
                        title: 'Clear Activity Timeline',
                        message: 'This will remove all activity events from this device. You cannot undo this action.',
                        confirmText: 'Clear Timeline',
                        onConfirm: () => {
                          setActivityEvents([]);
                          setConfirmState(prev => ({ ...prev, open: false }));
                          showNotification('> activity.timeline.cleared', 'success');
                        }
                      })}>Clear Timeline</button>
                    </div>
                    <div className="command-lenses">
                      <div className="lens-group">
                        <button className={`lens-btn ${activityRange === '24h' ? 'active' : ''}`} onClick={() => setActivityRange('24h')}>24H</button>
                        <button className={`lens-btn ${activityRange === '7d' ? 'active' : ''}`} onClick={() => setActivityRange('7d')}>7D</button>
                        <button className={`lens-btn ${activityRange === '30d' ? 'active' : ''}`} onClick={() => setActivityRange('30d')}>30D</button>
                        <button className={`lens-btn ${activityRange === 'all' ? 'active' : ''}`} onClick={() => setActivityRange('all')}>ALL</button>
                      </div>
                      <div className="lens-group">
                        {['all','encrypt','decrypt','backup','restore','lock','unlock','purge','purge_all'].map((t) => (
                          <button key={t} className={`lens-chip ${activityType === t ? 'active' : ''}`} onClick={() => setActivityType(t)}>
                            {t.replace('_', ' ').toUpperCase()}
                          </button>
                        ))}
                      </div>
                      <input
                        className="drawer-input command-search"
                        placeholder="Search by file or action"
                        value={activityQuery}
                        onChange={(e) => setActivityQuery(e.target.value)}
                      />
                    </div>
                    <div className="command-insight">
                      <div className="insight-label">Latest Signal</div>
                      <div className="insight-value">
                        {activitySummary.latest ? `${activitySummary.latest.detail} • ${new Date(activitySummary.latest.at).toLocaleTimeString()}` : 'No recent activity'}
                      </div>
                    </div>
                  </div>
                  <div className="activity-stats">
                    <div className="activity-stat">
                      <div className="activity-stat-label">Events</div>
                      <div className="activity-stat-value">{activitySummary.total}</div>
                      <div className="activity-stat-sub">{activityRange.toUpperCase()}</div>
                    </div>
                    <div className="activity-stat">
                      <div className="activity-stat-label">Encryptions</div>
                      <div className="activity-stat-value">{activitySummary.byType.encrypt || 0}</div>
                      <div className="activity-stat-sub">Files secured</div>
                    </div>
                    <div className="activity-stat">
                      <div className="activity-stat-label">Decryptions</div>
                      <div className="activity-stat-value">{activitySummary.byType.decrypt || 0}</div>
                      <div className="activity-stat-sub">Files opened</div>
                    </div>
                    <div className="activity-stat">
                      <div className="activity-stat-label">Last Backup</div>
                      <div className="activity-stat-value">{activitySummary.lastBackup ? 'Yes' : 'No'}</div>
                      <div className="activity-stat-sub">
                        {activitySummary.lastBackup ? new Date(activitySummary.lastBackup.at).toLocaleDateString() : 'No snapshot'}
                      </div>
                    </div>
                  </div>
                  <div className="drawer-card activity-timeline">
                    <div className="drawer-label">Timeline</div>
                    <div className="activity-filter-summary">
                      <div className="summary-pill">Showing {activityFiltered.length} events</div>
                      <div className="summary-pill">Range: {activityRange.toUpperCase()}</div>
                      <div className="summary-pill">Type: {activityType.toUpperCase().replace('_', ' ')}</div>
                      {activityQuery ? <div className="summary-pill">Query: {activityQuery}</div> : null}
                    </div>
                    {activityFiltered.length === 0 ? (
                      <div className="drawer-value">No activity for the selected filters.</div>
                    ) : (
                      <div className="activity-list">
                        {activityFiltered.slice(0, 10).map((event, idx) => {
                          const meta = getActivityMeta(event.type);
                          return (
                            <div key={event.id || `${event.at}-${idx}`} className={`activity-item ${meta.tone}`}>
                              <div className="activity-chip">{meta.label}</div>
                              <div className="activity-detail">{event.detail || meta.label}</div>
                              <div className="activity-time">{new Date(event.at).toLocaleString()}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="drawer-actions">
                      <button className="drawer-btn" onClick={backupVault}>Backup Now</button>
                      <button className="drawer-btn" onClick={() => showNotification('> activity.timeline.refreshed', 'success')}>Refresh</button>
                    </div>
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
                  <div className="drawer-card threat-deck">
                    <div className="threat-header">
                      <div>
                        <div className="threat-title">Threat Monitor Deck</div>
                        <div className="threat-sub">24h risk pulse + response controls</div>
                      </div>
                      <div className="threat-score-ring" style={{ '--pct': `${Math.min(100, threatScore * 10)}%` }}>
                        <div className="threat-score">{threatScore.toFixed(1)}</div>
                        <div className="threat-score-label">Risk</div>
                      </div>
                    </div>
                    <div className="threat-heat">
                      {threatSummary.heat.map((h) => (
                        <div key={h.label} className="heat-cell">
                          <div className="heat-label">{h.label}</div>
                          <div className="heat-bar">
                            <span style={{ width: `${Math.min(100, h.value * 20)}%` }}></span>
                          </div>
                          <div className="heat-value">{h.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="threat-actions">
                      <button className="drawer-btn" onClick={runThreatScan}>Run Threat Scan</button>
                      <button className="drawer-btn" onClick={manualLock}>Lock Vault</button>
                      <button className="drawer-btn" onClick={() => setAlertChannelEnabled(v => !v)}>
                        {alertChannelEnabled ? 'Disable Alerts' : 'Enable Alerts'}
                      </button>
                      <button className="drawer-btn" onClick={exportThreatLog}>Export Log</button>
                    </div>
                    <div className="threat-signal">
                      <div className="signal-label">Top Trigger</div>
                      <div className="signal-value">{threatSummary.topTrigger}</div>
                      <div className="signal-sub">Events in last 24h: {threatSummary.total}</div>
                    </div>
                  </div>
                  <div className="threat-grid">
                    <div className="threat-card">
                      <div className="threat-card-label">Unlock Failures</div>
                      <div className="threat-card-value">{threatSummary.unlockFailed}</div>
                      <div className="threat-card-sub">Last 24h</div>
                    </div>
                    <div className="threat-card warn">
                      <div className="threat-card-label">Decrypt Failures</div>
                      <div className="threat-card-value">{threatSummary.decryptFailed}</div>
                      <div className="threat-card-sub">Last 24h</div>
                    </div>
                    <div className="threat-card">
                      <div className="threat-card-label">Manual Locks</div>
                      <div className="threat-card-value">{threatSummary.manualLocks}</div>
                      <div className="threat-card-sub">Last 24h</div>
                    </div>
                    <div className="threat-card">
                      <div className="threat-card-label">Alert Channel</div>
                      <div className="threat-card-value">{alertChannelEnabled ? 'On' : 'Off'}</div>
                      <div className="threat-card-sub">Secure notifications</div>
                    </div>
                  </div>
                  <div className="drawer-card threat-feed">
                    <div className="drawer-label">Signal Feed</div>
                    <div className="drawer-list">
                      {threatSummary.last24h.length === 0 ? (
                        <div className="drawer-value">No recent signals</div>
                      ) : (
                        threatSummary.last24h.slice(0, 6).map((e, i) => (
                          <div key={e.id || `${e.at}-${i}`} className="threat-feed-item">
                            <span className="feed-pill">{(e.type || 'event').replace('_', ' ').toUpperCase()}</span>
                            <span className="feed-text">{e.detail || 'Threat signal recorded'}</span>
                            <span className="feed-time">{new Date(e.at).toLocaleTimeString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="drawer-actions">
                      <button className="drawer-btn" onClick={() => setThreatAlerts([])}>Clear Alerts</button>
                      <button className="drawer-btn" onClick={() => showNotification('> alert.channel.test', 'success')}>Test Alert</button>
                    </div>
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
                  <div className="storage-overview">
                    <div className="storage-card">
                      <div className="storage-label">Total Files</div>
                      <div className="storage-value">{fileCount}</div>
                      <div className="storage-sub">Encrypted items</div>
                    </div>
                    <div className="storage-card">
                      <div className="storage-label">Vault Size</div>
                      <div className="storage-value">{formatFileSize(totalBytes)}</div>
                      <div className="storage-sub">Current footprint</div>
                    </div>
                    <div className="storage-card">
                      <div className="storage-label">Largest File</div>
                      <div className="storage-value">{storageSnapshot.largest ? formatFileSize(storageSnapshot.largest.size) : '—'}</div>
                      <div className="storage-sub">{storageSnapshot.largest ? storageSnapshot.largest.name : 'No files yet'}</div>
                    </div>
                    <div className="storage-card">
                      <div className="storage-label">Last Snapshot</div>
                      <div className="storage-value">{storageSnapshot.lastBackup ? 'Ready' : 'None'}</div>
                      <div className="storage-sub">{storageSnapshot.lastBackup ? new Date(storageSnapshot.lastBackup.at).toLocaleString() : 'Create first backup'}</div>
                    </div>
                  </div>
                  <div className="storage-visuals">
                    <div className="drawer-card storage-visual-card">
                      <div className="drawer-label">Type Palette</div>
                      <div className={`storage-pie ${isStorageEmpty ? 'empty' : ''}`} style={isStorageEmpty ? undefined : pctStops} />
                      <div className="storage-legend">
                        <div className="legend-item"><span className="legend-dot docs" />Docs <strong>{pctDocs}%</strong></div>
                        <div className="legend-item"><span className="legend-dot media" />Media <strong>{pctMedia}%</strong></div>
                        <div className="legend-item"><span className="legend-dot archives" />Archives <strong>{pctArchives}%</strong></div>
                        <div className="legend-item"><span className="legend-dot other" />Other <strong>{pctOther}%</strong></div>
                      </div>
                    </div>
                    <div className="drawer-card storage-visual-card">
                      <div className="drawer-label">Core Mix</div>
                      <div className={`storage-donut ${isStorageEmpty ? 'empty' : ''}`} style={{ '--pct': `${Math.min(100, pctDocs + pctMedia)}%` }} />
                      <div className="storage-kpis">
                        <div className="kpi">
                          <div className="kpi-label">Docs + Media</div>
                          <div className="kpi-value">{Math.min(100, pctDocs + pctMedia)}%</div>
                        </div>
                        <div className="kpi">
                          <div className="kpi-label">Archives + Other</div>
                          <div className="kpi-value">{Math.max(0, 100 - pctDocs - pctMedia)}%</div>
                        </div>
                      </div>
                    </div>
                    <div className="drawer-card storage-visual-card">
                      <div className="drawer-label">Upload Pulse (7d)</div>
                      <div className="trend-bars">
                        {storageTrend.days.map((d, i) => (
                          <div key={`${d.label}-${i}`} className="trend-bar">
                            <span style={{ height: `${(d.count / storageTrend.max) * 100}%` }} />
                            <div className="trend-label">{d.label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="trend-sub">{fileCount === 0 ? 'No uploads yet' : 'Recent encrypted activity'}</div>
                    </div>
                  </div>
                  <div className="drawer-card storage-usage">
                    <div className="drawer-label">Live Usage Mix</div>
                    <div className="storage-bars">
                      <div className="storage-bar docs">
                        <span>Docs</span>
                        <div className="bar-track"><span style={{ width: `${pctDocs}%` }} /></div>
                        <strong>{pctDocs}%</strong>
                      </div>
                      <div className="storage-bar media">
                        <span>Media</span>
                        <div className="bar-track"><span style={{ width: `${pctMedia}%` }} /></div>
                        <strong>{pctMedia}%</strong>
                      </div>
                      <div className="storage-bar archives">
                        <span>Archives</span>
                        <div className="bar-track"><span style={{ width: `${pctArchives}%` }} /></div>
                        <strong>{pctArchives}%</strong>
                      </div>
                      <div className="storage-bar other">
                        <span>Other</span>
                        <div className="bar-track"><span style={{ width: `${pctOther}%` }} /></div>
                        <strong>{pctOther}%</strong>
                      </div>
                    </div>
                    <div className="drawer-actions">
                      <button className="drawer-btn" onClick={() => showNotification('> storage.optimization.complete', 'success')}>Optimize Storage</button>
                      <button className="drawer-btn" onClick={backupVault}>Create Snapshot</button>
                      <button className="drawer-btn" onClick={() => restoreInputRef.current?.click()}>Open Restore</button>
                    </div>
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
                  <div className="compliance-overview">
                    <div className={`compliance-card ${complianceSnapshot.gdpr.tone}`}>
                      <div className="compliance-label">GDPR</div>
                      <div className="compliance-value">{complianceSnapshot.gdpr.label}</div>
                      <div className="compliance-sub">{complianceStatus.gdpr ? new Date(complianceStatus.gdpr).toLocaleDateString() : 'Not generated'}</div>
                    </div>
                    <div className={`compliance-card ${complianceSnapshot.hipaa.tone}`}>
                      <div className="compliance-label">HIPAA</div>
                      <div className="compliance-value">{complianceSnapshot.hipaa.label}</div>
                      <div className="compliance-sub">{complianceStatus.hipaa ? new Date(complianceStatus.hipaa).toLocaleDateString() : 'Not generated'}</div>
                    </div>
                    <div className={`compliance-card ${complianceSnapshot.soc2.tone}`}>
                      <div className="compliance-label">SOC 2</div>
                      <div className="compliance-value">{complianceSnapshot.soc2.label}</div>
                      <div className="compliance-sub">{complianceStatus.soc2 ? new Date(complianceStatus.soc2).toLocaleDateString() : 'Not generated'}</div>
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

      {page === 'vault' && globalDropActive && (
        <div className="global-drop-overlay">
          <div className="global-drop-card">
            <div className="global-drop-title">Drop files to encrypt and import</div>
            <div className="global-drop-sub">Files are encrypted before storage.</div>
          </div>
        </div>
      )}

      {page === 'vault' && contextMenu.open && contextMenu.file && (
        <div
          className="file-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => { promptTagFile(contextMenu.file); setContextMenu(prev => ({ ...prev, open: false })); }}>Tag</button>
          <button onClick={() => { openExportModal(contextMenu.file); setContextMenu(prev => ({ ...prev, open: false })); }}>Export</button>
          <button onClick={() => { moveFileToTop(contextMenu.file); setContextMenu(prev => ({ ...prev, open: false })); }}>Move to Top</button>
          <button onClick={() => { copyFileToSecureClipboard(contextMenu.file); setContextMenu(prev => ({ ...prev, open: false })); }}>Copy Secure</button>
          <button className="danger" onClick={() => { deleteFile(contextMenu.file.id); setContextMenu(prev => ({ ...prev, open: false })); }}>Delete</button>
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
              <button type="button" className="cyber-btn btn-primary" style={{ minWidth: '80px' }} onClick={attemptFaceUnlock}>🙂 Face</button>
              <button type="button" className="cyber-btn btn-primary" style={{ minWidth: '80px' }} onClick={attemptIrisUnlock}>👁️ Iris</button>
              <button type="button" className="cyber-btn btn-primary" style={{ minWidth: '120px' }} onClick={attemptFingerprintUnlock}>👆 Fingerprint</button>
            </div>
          </div>
        </div>
      )}

      {viewingFile && (
        <div className={`file-view-overlay ${viewerFullscreen ? 'fullscreen' : ''}`}>
          <div className={`file-view-modal ${viewerFullscreen ? 'fullscreen' : ''}`} ref={fileViewRef}>
            <div className="file-view-header">
              <h2 className="file-view-title">{viewingFile.name}</h2>
              <div className="file-view-actions">
                {viewerFullscreen && viewingFileContent?.kind === 'pdf' && (
                  <div className="file-view-zoom">
                    <button
                      className={`cyber-btn btn-secondary file-view-close ${pdfHd ? 'active' : ''}`}
                      onClick={() => setPdfHd(v => !v)}
                    >
                      {pdfHd ? 'Normal' : 'HD'}
                    </button>
                    <button className="cyber-btn btn-secondary file-view-close" onClick={() => setPdfViewZoom(s => Math.max(0.5, Math.round((s - 0.1) * 10) / 10))}>Zoom -</button>
                    <span className="file-view-zoom-label">{Math.round(pdfViewZoom * 100)}%</span>
                    <button className="cyber-btn btn-secondary file-view-close" onClick={() => setPdfViewZoom(s => Math.min(2.5, Math.round((s + 0.1) * 10) / 10))}>Zoom +</button>
                  </div>
                )}
                <button className="cyber-btn btn-secondary file-view-close" onClick={toggleFileViewerFullscreen}>
                  {viewerFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </button>
                <button className="cyber-btn btn-danger file-view-close" onClick={closeFileViewer}>Close</button>
              </div>
            </div>
            {!viewingFileContent ? (
              <div className="file-view-body compact">
                <label className="form-label">Neural PIN</label>
                <div className="file-view-input-row compact">
                  <input
                    type="password"
                    className="form-input"
                    maxLength="3"
                    value={viewingFilePin}
                    onChange={e => setViewingFilePin(e.target.value)}
                    placeholder="•••"
                  />
                  <button className="cyber-btn btn-primary file-view-btn" onClick={handleViewFile}>Unlock</button>
                </div>
              </div>
            ) : (
              renderFileContent()
            )}
          </div>
        </div>
      )}

      {anomalyInfo.open && (
        <div className="anomaly-info-overlay" onClick={() => setAnomalyInfo({ open: false, event: null })}>
          <div className="anomaly-info-modal" onClick={(e) => e.stopPropagation()}>
            <div className="anomaly-info-title">{getAnomalyInfo(anomalyInfo.event).title}</div>
            <div className="anomaly-info-body">{getAnomalyInfo(anomalyInfo.event).body}</div>
            <button className="drawer-btn" onClick={() => setAnomalyInfo({ open: false, event: null })}>Close</button>
          </div>
        </div>
      )}

      {demoAccessNotice.open && (
        <div className="confirm-overlay" onClick={() => setDemoAccessNotice({ open: false, feature: '' })}>
          <div className="confirm-panel demo-gate-panel" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">Demo Access Limited</div>
            <div className="confirm-message">
              {demoAccessNotice.feature} is locked in demo mode. You are using a guest trial session with limited access and one-file upload. Log in or sign up to unlock full CyberVault capabilities.
            </div>
            <div className="confirm-actions">
              <button className="cyber-btn btn-secondary" onClick={() => setDemoAccessNotice({ open: false, feature: '' })}>Continue Demo</button>
              <button
                className="cyber-btn btn-primary"
                onClick={async () => {
                  await exitDemoMode();
                  showNotification('> login.required.for.full.access', 'info');
                }}
              >
                Go to Login
              </button>
            </div>
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
      {irisModalOpen && (
        <Suspense fallback={null}>
          <IrisModal
            mode={irisMode}
            open={irisModalOpen}
            onClose={closeIrisModal}
            onRegistered={onIrisRegistered}
            onAuthenticated={onIrisAuthenticated}
          />
        </Suspense>
      )}

      {/* NEW: Fingerprint Modal */}
      {fingerprintModalOpen && fingerprintModalData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(245, 248, 252, 0.98))', border: '1px solid var(--border-glow)', borderRadius: 20, padding: 30, width: '90%', maxWidth: 500, boxShadow: '0 0 50px rgba(159, 179, 223, 0.3)' }}>
            <Suspense fallback={null}>
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
            </Suspense>
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
                <div className="profile-avatar large" style={{ '--accent': profile.accent }}>
                  {profile.avatarUrl ? (
                    <img className="profile-avatar-img" src={profile.avatarUrl} alt={profileDisplayName} />
                  ) : (
                    profileDisplayName.charAt(0).toUpperCase()
                  )}
                </div>
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
                <label className="profile-label">Profile Icon</label>
                <div className="profile-avatar-row">
                  <div className="profile-avatar large" style={{ '--accent': profile.accent }}>
                    {profile.avatarUrl ? (
                      <img className="profile-avatar-img" src={profile.avatarUrl} alt={profileDisplayName} />
                    ) : (
                      profileDisplayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="profile-avatar-actions">
                    <input id="profileAvatarInput" type="file" accept="image/*" className="profile-avatar-input" onChange={handleAvatarChange} />
                    <label htmlFor="profileAvatarInput" className="profile-avatar-picker">
                      Change Photo
                    </label>
                    {profile.avatarUrl && (
                      <button className="cyber-btn btn-secondary" onClick={() => setProfile(prev => ({ ...prev, avatarUrl: '' }))}>Remove</button>
                    )}
                  </div>
                </div>
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

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onClose={() => setConfirmState(prev => ({ ...prev, open: false }))}
        onConfirm={confirmState.onConfirm || (() => setConfirmState(prev => ({ ...prev, open: false })))}
      />
      <ExportModal
        open={exportState.open}
        file={exportState.file}
        recommended={exportState.recommended}
        onClose={() => setExportState(prev => ({ ...prev, open: false }))}
        onSelect={(format) => {
          const file = exportState.file;
          setExportState(prev => ({ ...prev, open: false }));
          exportFileToSystem(file, format);
        }}
      />
      <AvatarCropModal
        open={avatarCrop.open}
        src={avatarCrop.src}
        zoom={avatarCrop.zoom}
        rotation={avatarCrop.rotation}
        onZoom={(v) => setAvatarCrop(prev => ({ ...prev, zoom: v }))}
        onRotate={(v) => setAvatarCrop(prev => ({ ...prev, rotation: v }))}
        onCancel={() => setAvatarCrop({ open: false, src: '', zoom: 1, rotation: 0, imgW: 0, imgH: 0 })}
        onSave={saveCroppedAvatar}
      />

      {/* Vault pet removed per user's request */}
      {missionOpen && (
        <Suspense fallback={null}>
          <MissionMode open={missionOpen} onClose={() => setMissionOpen(false)} />
        </Suspense>
      )}

      {isOCRSectionOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
    </div>
  );
}

export default App;

