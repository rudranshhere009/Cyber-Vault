import React, { useState, useRef, useEffect } from 'react';
import IrisDetector from '../utils/irisDetection';

function IrisModal({ mode, open, onClose, onRegistered, onAuthenticated }) {
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Initializing iris scanner...');
  const [detector] = useState(new IrisDetector());
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
