import React, { useEffect, useState, useRef } from 'react';

// Productivity + Game-like Challenges: useful yet fun missions
const WORKFLOWS = [
  { id: 'backup', title: 'Run Vault Backup', desc: 'Create a secure vault backup file.' },
  { id: 'integrity', title: 'Integrity Scan', desc: 'Verify metadata & checksums for stored files.' },
  { id: 'report', title: 'Create Quick Report', desc: 'Export a short audit summary.' },
];

const CHALLENGES = [
  { id: 'speed-scan', title: '⚡ Speed Scan', desc: 'Scan 50+ files in < 5s', duration: 5000, target: 50, badge: '⚡', reward: 25 },
  { id: 'tag-master', title: '🏷️ Tag Master', desc: 'Tag 20+ files with multiple tags', target: 20, badge: '🏷️', reward: 20 },
  { id: 'encrypt-race', title: '🔐 Encryption Speedrun', desc: 'Backup & verify integrity in < 3s', duration: 3000, badge: '🔐', reward: 30 },
  { id: 'file-organizer', title: '📂 File Organizer', desc: 'Create 5+ distinct tag groups', target: 5, badge: '📂', reward: 15 },
];

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  const k = 1024, sizes = ['B','KB','MB','GB'];
  const i = Math.max(0, Math.floor(Math.log(Math.max(bytes,1))/Math.log(k)));
  return `${(bytes/Math.pow(k,i)).toFixed(2)} ${sizes[i]}`;
}

function localToast(msg, variant = 'info') {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `position:fixed;right:24px;bottom:24px;padding:8px 12px;border-radius:8px;z-index:10060;background:${variant==='error' ? '#3b0b0b' : '#072032'};color:#cff8ff;box-shadow:0 8px 30px rgba(0,0,0,0.6);`;
  document.body.appendChild(el);
  setTimeout(()=> el.style.opacity = '0', 2600);
  setTimeout(()=> { if (document.body.contains(el)) document.body.removeChild(el); }, 3000);
}

export default function MissionMode({ open = false, onClose = () => {} }) {
  const hasElectron = Boolean(window.electronAPI);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [scanResults, setScanResults] = useState([]);
  const [filesList, setFilesList] = useState([]);
  const [activeChallengeId, setActiveChallengeId] = useState(null);
  const [challengeProgress, setChallengeProgress] = useState({});
  const [badges, setBadges] = useState([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (!hasElectron) {
      localToast('Mission Mode needs desktop (Electron) APIs.');
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const idx = (await window.electronAPI.readVaultIndex()) || {};
        if (!mounted) return;
        setHistory((idx.missionHistory || []).slice(-50));
        setBadges(idx.challengesCompleted || []);
        const list = [];
        if (idx.files) {
          for (const [k, v] of Object.entries(idx.files)) list.push({ id: k, name: v.name || k, meta: v });
        }
        setFilesList(list);
      } catch (e) {
        console.error('load workflows index', e);
      }
    })();
    return () => { mounted = false; if (timerRef.current) clearTimeout(timerRef.current); };
  }, [open, hasElectron]);

  async function runIntegrityScan() {
    if (!hasElectron) { localToast('Integrity scan unavailable in web mode', 'error'); return []; }
    setBusy(true);
    const results = [];
    try {
      const idx = (await window.electronAPI.readVaultIndex()) || {};
      const entries = Object.entries(idx.files || {}).slice(0, 200);
      for (const [key, meta] of entries) {
        try {
          if (!meta.dataId) { results.push({ file: key, status: 'no-blob' }); continue; }
          const raw = await window.electronAPI.readVaultBlob(`${meta.dataId}.bin`);
          if (!raw) { results.push({ file: key, status: 'missing' }); continue; }
          const u8 = new Uint8Array(raw);
          const h = await crypto.subtle.digest('SHA-256', u8);
          const hex = Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2,'0')).join('');
          results.push({ file: key, status: hex === meta.checksum ? 'ok' : 'mismatch', checksum: hex });
        } catch (e) { results.push({ file: key, status: 'error' }); }
      }
    } catch (e) { console.error(e); }
    setScanResults(results);
    setBusy(false);
    localToast('Integrity scan complete');
    return results;
  }

  async function applyTagsToSelected(tagStr) {
    if (!hasElectron) { localToast('Tag actions unavailable in web mode', 'error'); return 0; }
    if (!tagStr || !selectedFiles.length) { localToast('No files selected'); return; }
    const tags = tagStr.split(',').map(t => t.trim()).filter(Boolean);
    try {
      const idx = (await window.electronAPI.readVaultIndex()) || {};
      idx.files = idx.files || {};
      for (const id of selectedFiles) {
        idx.files[id] = idx.files[id] || {};
        idx.files[id].tags = Array.from(new Set([...(idx.files[id].tags||[]), ...tags]));
      }
      await window.electronAPI.writeVaultIndex(idx);
      localToast('Tags applied');
      return tags.length;
    } catch (e) { localToast('Failed to apply tags', 'error'); return 0; }
  }

  async function createQuickReport() {
    if (!hasElectron) { localToast('Report export unavailable in web mode', 'error'); return; }
    try {
      const idx = (await window.electronAPI.readVaultIndex()) || {};
      const report = { ts: Date.now(), fileCount: Object.keys(idx.files || {}).length, historyCount: (idx.missionHistory||[]).length };
      await window.electronAPI.saveVaultBackup(`report-${Date.now()}.json`, report);
      localToast('Report saved');
    } catch (e) { localToast('Report failed', 'error'); }
  }

  async function runBackup() {
    if (!hasElectron) { localToast('Backup unavailable in web mode', 'error'); return; }
    try {
      await window.electronAPI.saveVaultBackup(`manual-backup-${Date.now()}.json`, { ts: Date.now(), reason: 'manual' });
      localToast('Manual backup saved');
    } catch (e) { localToast('Backup failed','error'); }
  }

  async function runWorkflow(id) {
    if (id === 'backup') return runBackup();
    if (id === 'integrity') return runIntegrityScan();
    if (id === 'report') return createQuickReport();
  }

  // Challenge: Speed Scan - scan 50+ files in < 5s
  async function runSpeedScan() {
    setActiveChallengeId('speed-scan');
    setChallengeProgress({ percent: 0, message: 'Starting speed scan...' });
    try {
      const startTime = Date.now();
      const results = await runIntegrityScan();
      const elapsed = (Date.now() - startTime) / 1000;
      const challenge = CHALLENGES.find(c => c.id === 'speed-scan');
      if (results.length >= challenge.target && elapsed < (challenge.duration / 1000)) {
        localToast(`✓ Speed Scan Complete! ${results.length} files scanned in ${elapsed.toFixed(1)}s — Badge unlocked!`);
        await completedChallenge('speed-scan');
      } else {
        localToast(`Scan complete (${results.length}/${challenge.target} files, ${elapsed.toFixed(1)}s). Try again!`);
      }
    } catch (e) { localToast('Speed Scan failed', 'error'); }
    setActiveChallengeId(null);
  }

  // Challenge: Tag Master - tag 20+ files
  async function runTagMaster() {
    setActiveChallengeId('tag-master');
    const count = selectedFiles.length;
    if (count < 1) {
      localToast('Select 20+ files to tag, add tags, and click Apply.');
      setActiveChallengeId(null);
      return;
    }
    const tagStr = document.getElementById('batchTagsInput')?.value || '';
    if (!tagStr) {
      localToast('Add comma-separated tags to the input field.');
      setActiveChallengeId(null);
      return;
    }
    const numTagged = await applyTagsToSelected(tagStr);
    const challenge = CHALLENGES.find(c => c.id === 'tag-master');
    if (numTagged && selectedFiles.length >= challenge.target) {
      localToast(`✓ Tag Master Complete! Tagged ${selectedFiles.length} files — Badge unlocked!`);
      await completedChallenge('tag-master');
    } else {
      localToast(`Tagged ${selectedFiles.length}/${challenge.target} files. Select more and try again!`);
    }
    setActiveChallengeId(null);
  }

  // Challenge: Encryption Speedrun - backup + verify integrity in < 3s
  async function runEncryptionSpeedrun() {
    setActiveChallengeId('encrypt-race');
    setChallengeProgress({ percent: 0, message: 'Starting backup & verification...' });
    try {
      const startTime = Date.now();
      await runBackup();
      const results = await runIntegrityScan();
      const elapsed = (Date.now() - startTime) / 1000;
      const challenge = CHALLENGES.find(c => c.id === 'encrypt-race');
      if (elapsed < (challenge.duration / 1000)) {
        localToast(`✓ Encryption Speedrun Complete in ${elapsed.toFixed(1)}s — Badge unlocked!`);
        await completedChallenge('encrypt-race');
      } else {
        localToast(`Completed in ${elapsed.toFixed(1)}s. Try to finish in < 3s!`);
      }
    } catch (e) { localToast('Encryption Speedrun failed', 'error'); }
    setActiveChallengeId(null);
  }

  // Challenge: File Organizer - create 5+ distinct tag groups
  async function runFileOrganizer() {
    if (!hasElectron) { localToast('Organizer check unavailable in web mode', 'error'); return; }
    setActiveChallengeId('file-organizer');
    try {
      const idx = (await window.electronAPI.readVaultIndex()) || {};
      const allTags = new Set();
      Object.values(idx.files || {}).forEach(f => {
        if (f.tags && Array.isArray(f.tags)) f.tags.forEach(t => allTags.add(t));
      });
      const challenge = CHALLENGES.find(c => c.id === 'file-organizer');
      if (allTags.size >= challenge.target) {
        localToast(`✓ File Organizer Complete! Found ${allTags.size} unique tag groups — Badge unlocked!`);
        await completedChallenge('file-organizer');
      } else {
        localToast(`Current tag groups: ${allTags.size}/${challenge.target}. Add more tags to files!`);
      }
    } catch (e) { localToast('File Organizer check failed', 'error'); }
    setActiveChallengeId(null);
  }

  async function completedChallenge(cId) {
    if (!hasElectron) return;
    try {
      const idx = (await window.electronAPI.readVaultIndex()) || {};
      idx.challengesCompleted = idx.challengesCompleted || [];
      if (!idx.challengesCompleted.includes(cId)) {
        idx.challengesCompleted.push(cId);
        setBadges(idx.challengesCompleted);
      }
      await window.electronAPI.writeVaultIndex(idx);
    } catch (e) { console.error('Failed to persist badge', e); }
  }

  async function startChallenge(cId) {
    if (cId === 'speed-scan') return runSpeedScan();
    if (cId === 'tag-master') return runTagMaster();
    if (cId === 'encrypt-race') return runEncryptionSpeedrun();
    if (cId === 'file-organizer') return runFileOrganizer();
  }

  if (!open) return null;

  return (
    <div className="ocr-overlay">
      <div className="ocr-modal mission" role="dialog" aria-modal="true">
        <div className="ocr-header">
          <div className="ocr-title">
            <div>
              <div className="ocr-title-text">Mission Control — Workflows & Challenges</div>
              <div className="ocr-subtitle">Automations + playable challenges to earn badges</div>
            </div>
          </div>
          <button className="cyber-btn btn-danger" onClick={onClose}>Close</button>
        </div>

        <div className="ocr-body">
          <div className="ocr-left">
            <div className="ocr-panel">
              <div className="ocr-panel-title">Workflows</div>
              <div className="ocr-panel-list">
                {WORKFLOWS.map(w => (
                  <div key={w.id} className="mission-row">
                    <div>
                      <div style={{ fontWeight:800 }}>{w.title}</div>
                      <div style={{ fontSize:12, opacity:0.75 }}>{w.desc}</div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <button className="small-btn" onClick={() => runWorkflow(w.id)}>Run</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ocr-panel" style={{ marginTop:10 }}>
              <div className="ocr-panel-title">Challenges {badges.length > 0 && `(${badges.length} badges)`}</div>
              <div className="ocr-panel-list">
                {CHALLENGES.map(c => (
                  <div key={c.id} className="mission-row">
                    <div>
                      <div style={{ fontWeight:800 }}>{c.title}</div>
                      <div style={{ fontSize:12, opacity:0.75 }}>{c.desc}</div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      {badges.includes(c.id) && <span title="Badge earned" style={{fontSize:'16px'}}>{c.badge}</span>}
                      <button className="small-btn" onClick={() => startChallenge(c.id)} disabled={activeChallengeId !== null}>{badges.includes(c.id) ? '✓' : 'Play'}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ocr-right">
            <div className="ocr-panel">
              <div className="ocr-panel-title">Quick File Actions</div>
              <input className="ocr-picker-input" placeholder="Search files..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              <div style={{ maxHeight:240, overflow:'auto', marginTop:8 }}>
                {filesList.filter(f => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0,200).map(f => (
                  <label key={f.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:6, borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <input type="checkbox" checked={selectedFiles.includes(f.id)} onChange={(e) => setSelectedFiles(prev => e.target.checked ? [...prev, f.id] : prev.filter(x=>x!==f.id))} />
                      <div style={{ fontSize:13 }}>{f.name}</div>
                    </div>
                    <div style={{ opacity:0.7 }}>{f.meta?.size ? formatFileSize(f.meta.size) : ''}</div>
                  </label>
                ))}
              </div>
              <div style={{ marginTop:8, display:'flex', gap:8 }}>
                <input id="batchTagsInput" placeholder="tags,comma,separated" className="form-input" />
                <button className="cyber-btn btn-primary" onClick={() => applyTagsToSelected((document.getElementById('batchTagsInput')||{}).value)}>Apply</button>
              </div>
            </div>

            <div className="ocr-panel" style={{ marginTop:10 }}>
              <div className="ocr-panel-title">Scan Results</div>
              <div style={{ maxHeight:180, overflow:'auto' }}>
                {scanResults.length === 0 ? <div className="ocr-muted">No scan results yet.</div> : scanResults.map((r,i)=>(
                  <div key={i} style={{ padding:6, borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <div style={{ fontSize:13 }}>{r.file}</div>
                      <div style={{ opacity:0.7 }}>{r.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
