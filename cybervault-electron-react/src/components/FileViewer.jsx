import React, { useState } from 'react';
import { decryptFile } from '../utils/encryption';

function FileViewer({ file }) {
  const hasElectron = Boolean(window.electronAPI);
  const [neuralKey, setNeuralKey] = useState('');
  const [fileContent, setFileContent] = useState(null);
  const [checking, setChecking] = useState(false);

  const handleFileOpen = async () => {
    try {
      const decryptedContent = await decryptFile(file, neuralKey);
      setFileContent(decryptedContent);
    } catch (error) {
      alert('Failed to open file');
    }
  };

  const renderFilePreview = () => {
    if (!fileContent) return null;

    if ((file.type || '').startsWith('image/')) return <img src={fileContent} alt="Preview" />;
    if (file.type === 'application/pdf') return <iframe src={fileContent} title="PDF Preview" />;
    if ((file.type || '').startsWith('text/')) return <pre>{fileContent}</pre>;
    return <div>Preview not available for this file type</div>;
  };

  const promptAddTag = async () => {
    if (!hasElectron) {
      alert('Tag update is unavailable in web mode');
      return;
    }
    const tag = prompt('Add a tag for ' + file.name + ' (comma-separated)');
    if (!tag) return;
    const tags = tag.split(',').map(t => t.trim()).filter(Boolean);
    try {
      const idx = (await window.electronAPI.readVaultIndex()) || {};
      idx.files = idx.files || {};
      const key = file.id || file.name;
      idx.files[key] = idx.files[key] || {};
      idx.files[key].tags = Array.from(new Set([...(idx.files[key].tags || []), ...tags]));
      await window.electronAPI.writeVaultIndex(idx);
      alert('Tags updated');
    } catch (e) { alert('Failed to update tags'); }
  };

  const verifyChecksum = async () => {
    if (!file.checksum) { alert('No checksum available for this file'); return; }
    setChecking(true);
    try {
      // Attempt to read blob via preload
      if (window.electronAPI?.readVaultBlob && file.dataId) {
        const raw = await window.electronAPI.readVaultBlob(`${file.dataId}.bin`);
        if (!raw) { alert('No blob found'); setChecking(false); return; }
        const u8 = new Uint8Array(raw);
        const h = await crypto.subtle.digest('SHA-256', u8);
        const hex = Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2,'0')).join('');
        alert(hex === file.checksum ? 'Checksum OK' : `Mismatch: ${hex}`);
      } else {
        alert('Cannot access file blob to verify checksum');
      }
    } catch (e) { alert('Checksum verification failed'); }
    setChecking(false);
  };

  return (
    <div className="file-viewer">
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <input
          type="password"
          placeholder="Neural Key (optional)"
          value={neuralKey}
          onChange={(e) => setNeuralKey(e.target.value)}
        />
        <button onClick={handleFileOpen}>Open</button>
        <button onClick={promptAddTag}>Add Tag</button>
        <button onClick={verifyChecksum} disabled={checking}>{checking ? 'Checking...' : 'Verify Checksum'}</button>
      </div>
      {fileContent && (
        <div className="preview-container">
          {renderFilePreview()}
          <div style={{ marginTop:8 }}><button onClick={() => setFileContent(null)}>Close Preview</button></div>
        </div>
      )}
    </div>
  );
}
