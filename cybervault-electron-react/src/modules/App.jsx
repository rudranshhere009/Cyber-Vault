import React, { useEffect, useMemo, useRef, useState } from 'react';
import OCRSection from '../components/Chatbot';
import IrisModal from '../components/IrisModal'; // NEW: Import iris modal
import IrisDetector from '../utils/irisDetection'; // NEW: Import iris detector

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
const toB64 = (u8) => btoa(String.fromCharCode(...u8));
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

  const [page, setPage] = useState('greeting');
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
  const autoLockMs = 5 * 60 * 1000;

  const [query, setQuery] = useState('');

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
  }, [page]);

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
    return irisDetector.compareIrisTemplates(template1, template2, 0.75);
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
        irisTemplate // NEW: Store iris template
      };
      localStorage.setItem('neuralUser_' + signupEmail, JSON.stringify(userData));
      hideLoading();
      showNotification('> neural.profile.created.with.biometrics', 'success');
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
      window.electronAPI.forceRepaint();
      window.location.reload();
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
    } catch (err) {
      console.error(err);
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
      showNotification(`> ${f.name}.purged.from.neural.network`, 'success');
    }
  }

  async function clearAllFiles() {
    if (confirm('> confirm.neural.network.purge.all.data.irreversible\n\nThis will permanently delete ALL encrypted files.')) {
      try { for (const f of files) { if (f.dataId) await idbDelete(f.dataId); } } catch {}
      localStorage.removeItem('cyberVaultFiles');
      setFiles([]);
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
      const payload = enc.encode(JSON.stringify({ files: filesForBackup }));
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveQuantumKey(pwd, salt);
      const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload));
      const out = { v: 1, s: toHex(salt), i: toHex(iv), c: toB64(ciphertext) };
      const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `cybervault_backup_${new Date().toISOString().slice(0,10)}.cybvlt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
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
    showNotification('> neural.vault.locked', 'info');
  }

  async function attemptUnlock(e) {
    e?.preventDefault?.();
    const pwd = lockInput;
    if (!pwd || pwd.length < 8) { showNotification('> neural.key.insufficient.minimum_8_chars', 'error'); return; }

    if (session?.masterPassword && pwd === session.masterPassword) {
      setMasterPassword(pwd);
      setLocked(false);
      setLockInput('');
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
        showNotification('> neural.vault.unlocked', 'success');
      } else {
        showNotification('> invalid.neural.key', 'error');
      }
    } catch {
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
  
  const fileInputRef = useRef(null);

  const fileCount = files.length;
  const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);

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
      {page === 'greeting' && (
        <div className="login-page" id="greetingPage">
          <div className="auth-container">
            <div className="neural-header">
              <h1 className="neural-title">Welcome to CyberVault</h1>
              <p className="neural-subtitle">&gt; What you wanna do ahead?</p>
            </div>
            <div className="auth-form-container">
              <div className="greeting-actions">
                <button className="submit-btn" onClick={() => setPage('login')}>Login</button>
                <button className="submit-btn" onClick={() => { setPage('login'); setMode('signup'); }}>Sign Up</button>
              </div>
            </div>
          </div>
        </div>
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
                  {/* NEW: Updated login buttons with iris option */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button type="submit" className="submit-btn">🚀 Password Login</button>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="button" className="cyber-btn btn-primary" style={{ flex: 1 }} onClick={handleFaceLogin}>🧠 Face</button>
                      <button type="button" className="cyber-btn btn-primary" style={{ flex: 1 }} onClick={handleIrisLogin}>👁️ Iris</button>
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
                  <button type="submit" className="submit-btn">⚡ Create Profile (Face + Iris Required)</button>
                </form>
              )}

              <div className="security-info">
                <h4 className="security-title">🛡️ Quantum Security</h4>
                <ul className="security-features">
                  <li>AES-256 quantum-resistant encryption</li>
                  <li>Neural key derivation (PBKDF2-SHA256)</li>
                  <li>Zero-knowledge architecture</li>
                  <li>Multi-modal biometric authentication (Face + Iris)</li>
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
              <h1>
                CyberVault
                <div className="user-info">
                  <div className="user-avatar" id="userAvatar">{(session?.username || 'U').charAt(0).toUpperCase()}</div>
                  <span id="welcomeText">Welcome, {session?.username || 'User'}!</span>
                  <button className="logout-btn" onClick={logout}>Logout</button>
                </div>
              </h1>
              <p>&gt; quantum-encrypted.neural-storage.protocol_v2.1</p>
            </div>

            <div className="main-grid">
              <div className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <div className="security-badge">
                    <h4>🛡️ Quantum Security</h4>
                    <p>AES-256 neural encryption with quantum-resistant protocols. Zero-knowledge architecture.</p>
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

                  <div className="cyber-section" style={{ display: 'grid', gap: 10 }}>
                    <button className="cyber-btn btn-secondary" onClick={() => setIsOCRSectionOpen(true)}>📝 OCR</button>
                    <button className="cyber-btn btn-secondary" onClick={manualLock}>🔒 Lock Vault</button>
                    <button className="cyber-btn btn-primary" onClick={backupVault}>⬇️ Backup Vault</button>
                    <button className="cyber-btn btn-secondary" onClick={() => restoreInputRef.current?.click()}>⬆️ Restore Vault</button>
                    <input type="file" ref={restoreInputRef} accept=".cybvlt,application/json" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) restoreVaultFromFile(f); e.target.value = ''; }} />
                  </div>

                  <div className="cyber-section">
                    <h3>🔎 Search</h3>
                    <input type="text" className="password-input" placeholder="Filter by file name..." value={query} onChange={e => setQuery(e.target.value)} />
                  </div>
                </div>
                <button className="cyber-btn btn-danger" onClick={clearAllFiles} style={{ width: '100%', marginTop: 10 }}>
                  🗑️ Purge All Data
                </button>
              </div>

              <div className="main-content">
                <div className="upload-zone" onClick={() => fileInputRef.current?.click()} onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }} onDragLeave={e => e.currentTarget.classList.remove('dragover')} onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); handleFiles(e.dataTransfer.files); }}>
                  <div className="upload-icon">⚡</div>
                  <div className="upload-text">NEURAL UPLOAD INTERFACE</div>
                  <div className="upload-subtext">&gt; drag.files || click.to.encrypt</div>
                  <input type="file" id="fileInput" ref={fileInputRef} multiple onChange={e => handleFiles(e.target.files)} />
                </div>

                <div className="files-grid" id="filesGrid">
                  {displayedFiles.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">🤷</div>
                      <h3>{files.length === 0 ? 'Neural Network Empty' : 'No matches'}</h3>
                      <p>{files.length === 0 ? '> upload.files.to.initialize.quantum.storage' : '> adjust.search.query'}</p>
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
            {/* NEW: Added iris unlock option */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 8 }}>
              <button type="button" className="cyber-btn btn-primary" onClick={attemptFaceUnlock}>🧠 Face</button>
              <button type="button" className="cyber-btn btn-primary" onClick={attemptIrisUnlock}>👁️ Iris</button>
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