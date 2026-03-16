import React, { useState, useRef, useEffect } from 'react';

function IrisModal({ mode, open, onClose, onRegistered, onAuthenticated }) {
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Initializing iris scanner...');
  const detectorRef = useRef(null);
  const [samples, setSamples] = useState([]);
  const samplesRef = useRef([]);
  const isMobileCapture = () => {
    try {
      if (window.matchMedia?.('(max-width: 900px)').matches) return true;
    } catch {}
    return /Android|webOS|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent || '');
  };

  useEffect(() => {
    let stream;
    let cancelled = false;
    let detectionInterval;

    async function start() {
      if (!open) return;
      
      try {
        setLoading(true);
        setMessage('Loading iris detection modules...');
        
        // Dynamically load iris detector (avoid top-level static import so dev server errors don't break the page)
        try {
          const mod = await import('../utils/irisDetection.js');
          console.log('IrisModal: loaded irisDetection module');
          detectorRef.current = new mod.default();
        } catch (impErr) {
          console.warn('IrisModal: dynamic import failed, using inline fallback', impErr && impErr.stack ? impErr.stack : impErr);
          // Inline fallback (same minimal API: initialize, detectIris)
          class InlineFallback {
            constructor() { this.isInitialized = false; }
            async initialize() {
              try {
                const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                s.getTracks().forEach(t => t.stop());
                this.isInitialized = true;
                console.log('Iris InlineFallback initialized');
                return true;
              } catch (e) {
                console.error('Iris InlineFallback init failed', e);
                throw e;
              }
            }
            async detectIris(videoEl) {
              if (!this.isInitialized) throw new Error('not initialized');
              try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = videoEl.videoWidth || 640;
                canvas.height = videoEl.videoHeight || 480;
                ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
                const cx = canvas.width/2, cy = canvas.height/2, rs = 100;
                const img = ctx.getImageData(cx-rs/2, cy-rs/2, rs, rs);
                const out = [];
                for (let i=0;i<img.data.length;i+=16) {
                  const r = img.data[i], g = img.data[i+1], b = img.data[i+2];
                  out.push(Math.round(0.299*r + 0.587*g + 0.114*b));
                }
                return out;
              } catch (e) { console.error('Iris InlineFallback detect error', e); return null; }
            }
          }
          detectorRef.current = new InlineFallback();
        }

        // Initialize detector instance
        await detectorRef.current.initialize();
        
        if (cancelled) return;
        
        setMessage('Activating camera...');

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640, min: 480 },
            height: { ideal: 480, min: 360 }
          },
          audio: false
        });
        
        if (cancelled) return;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          videoRef.current.addEventListener('play', () => {
            setMessage('Position your eye in the center circle');
            setLoading(false);
            samplesRef.current = [];
            setSamples([]);
            
            // Start iris detection
            detectionInterval = setInterval(async () => {
              if (!open || !videoRef.current) return;

              const irisData = await detectorRef.current.detectIris(videoRef.current);
              
              if (irisData) {
                const mean = irisData.reduce((sum, v) => sum + v, 0) / irisData.length;
                const variance = irisData.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / irisData.length;
                const minBrightness = isMobileCapture() ? 45 : 60;
                const maxBrightness = isMobileCapture() ? 215 : 200;
                const minVariance = isMobileCapture() ? 130 : 200;
                const neededSamples = isMobileCapture() ? 4 : 3;

                if (mean < minBrightness) {
                  setMessage('Too dark. Increase lighting and keep eye centered.');
                  return;
                }
                if (mean > maxBrightness) {
                  setMessage('Too bright. Reduce glare and avoid direct light.');
                  return;
                }
                if (variance < minVariance) {
                  setMessage('Eye not focused. Hold still and avoid blinking.');
                  return;
                }

                samplesRef.current = [...samplesRef.current, irisData];
                setSamples(samplesRef.current);
                setMessage(`Iris sample ${samplesRef.current.length}/${neededSamples} captured`);

                if (samplesRef.current.length >= neededSamples) {
                  clearInterval(detectionInterval);

                  if (mode === 'register') {
                    const avgTemplate = averageIrisTemplates(samplesRef.current);
                    onRegistered(avgTemplate);
                  } else {
                    onAuthenticated(irisData);
                  }
                  onClose();
                }
              }
            }, 500);
          });
          
          await videoRef.current.play();
        }
      } catch (err) {
        console.error(err);
        setMessage('Camera or iris detection error. Ensure good lighting and position your eye clearly.');
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

  function averageIrisTemplates(templates) {
    if (templates.length === 0) return [];
    
    const avgTemplate = new Array(templates[0].length).fill(0);
    
    for (const template of templates) {
      for (let i = 0; i < template.length; i++) {
        avgTemplate[i] += template[i];
      }
    }
    
    for (let i = 0; i < avgTemplate.length; i++) {
      avgTemplate[i] = Math.round(avgTemplate[i] / templates.length);
    }
    
    return avgTemplate;
  }

  if (!open) return null;

  return (
    <div className="confirm-overlay biometric-overlay">
      <div className="biometric-panel">
        <div className="confirm-title biometric-title">
          {mode === 'register' ? 'Register Iris' : 'Iris Authentication'}
        </div>
        <div className="password-status biometric-status">
          {loading ? 'Loading...' : message}
        </div>
        <div className="biometric-tip">
          Tips: keep your eye centered, avoid glare, and hold still without blinking.
        </div>
        <div className="biometric-video-wrap">
          <video ref={videoRef} className="biometric-video" muted playsInline />
          <div className="iris-target-circle" />
        </div>
        <div className="biometric-actions spread">
          <button className="cyber-btn btn-secondary" onClick={onClose}>Cancel</button>
          <div className="biometric-counter">
            Samples: {samples.length}/{isMobileCapture() ? 4 : 3}
          </div>
        </div>
      </div>
    </div>
  );
}

export default IrisModal;
