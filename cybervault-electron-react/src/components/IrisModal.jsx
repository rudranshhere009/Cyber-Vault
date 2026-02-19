import React, { useState, useRef, useEffect } from 'react';
import IrisDetector from '../utils/irisDetection';

function IrisModal({ mode, open, onClose, onRegistered, onAuthenticated }) {
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Initializing iris scanner...');
  const [detector] = useState(new IrisDetector());
  const [samples, setSamples] = useState([]);
  const samplesRef = useRef([]);

  useEffect(() => {
    let stream;
    let cancelled = false;
    let detectionInterval;

    async function start() {
      if (!open) return;
      
      try {
        setLoading(true);
        setMessage('Loading iris detection modules...');
        
        // Initialize iris detector
        await detector.initialize();
        
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

              const irisData = await detector.detectIris(videoRef.current);
              
              if (irisData) {
                const mean = irisData.reduce((sum, v) => sum + v, 0) / irisData.length;
                const variance = irisData.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / irisData.length;
                if (mean < 60) {
                  setMessage('Too dark. Increase lighting and keep eye centered.');
                  return;
                }
                if (mean > 200) {
                  setMessage('Too bright. Reduce glare and avoid direct light.');
                  return;
                }
                if (variance < 200) {
                  setMessage('Eye not focused. Hold still and avoid blinking.');
                  return;
                }

                samplesRef.current = [...samplesRef.current, irisData];
                setSamples(samplesRef.current);
                setMessage(`Iris sample ${samplesRef.current.length}/3 captured`);

                if (samplesRef.current.length >= 3) {
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
  }, [open, mode, onClose, onAuthenticated, onRegistered, detector]);

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
       <div style={{ 
    position: 'fixed', 
    inset: 0, 
    background: 'linear-gradient(135deg, rgba(212, 227, 240, 0.98), rgba(150, 168, 199, 0.98))',  // ← NEW
    zIndex: 10000, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center' 
  }}>
      <div style={{ background: 'linear-gradient(145deg, var(--glass-bg), rgba(15, 15, 25, 0.95))', border: '1px solid var(--border-glow)', borderRadius: 16, padding: 16, width: 520, boxShadow: '0 0 50px rgba(0, 212, 255, 0.2)' }}>
        <div className="neural-title" style={{ fontSize: 22, marginBottom: 8 }}>
          👁️ {mode === 'register' ? 'Register Iris' : 'Iris Authentication'}
        </div>
        <div className="password-status" style={{ marginBottom: 6 }}>
          {loading ? 'Loading...' : message}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: 8 }}>
          Tips: keep your eye centered, avoid glare, and hold still without blinking.
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, position: 'relative' }}>
          <video ref={videoRef} width="480" height="360" style={{ borderRadius: 12, border: '1px solid var(--border-glow)', background: '#000', transform: 'scaleX(-1)' }} muted playsInline />
          {/* Iris targeting circle */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100px',
            height: '100px',
            border: '2px solid var(--primary-cyan)',
            borderRadius: '50%',
            boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
            pointerEvents: 'none'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <button className="cyber-btn btn-secondary" onClick={onClose}>Cancel</button>
          <div style={{ color: 'var(--primary-cyan)', fontSize: '12px' }}>
            Samples: {samples.length}/3
          </div>
        </div>
      </div>
    </div>
  );
}

export default IrisModal;
