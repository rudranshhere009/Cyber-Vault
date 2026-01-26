import React, { useState } from 'react';
import { decryptFile } from '../utils/encryption';

function FileViewer({ file }) {
  const [neuralKey, setNeuralKey] = useState('');
  const [fileContent, setFileContent] = useState(null);

  const handleFileOpen = async () => {
    try {
      const isValidKey = await validateNeuralKey(neuralKey);
      if (!isValidKey) {
        toast.error('Invalid Neural Key');
        return;
      }

      const decryptedContent = await decryptFile(file, neuralKey);
      setFileContent(decryptedContent);
    } catch (error) {
      toast.error('Failed to open file');
    }
  };

  const renderFilePreview = () => {
    if (!fileContent) return null;

    switch (file.type) {
      case 'image':
        return <img src={fileContent} alt="Preview" />;
      case 'pdf':
        return <iframe src={fileContent} title="PDF Preview" />;
      case 'text':
        return <pre>{fileContent}</pre>;
      default:
        return <div>Preview not available for this file type</div>;
    }
  };

  return (
    <div className="file-viewer">
      {!fileContent ? (
        <div className="neural-key-input">
          <input
            type="password"
            maxLength="3"
            placeholder="Enter Neural Key"
            value={neuralKey}
            onChange={(e) => setNeuralKey(e.target.value)}
          />
          <button onClick={handleFileOpen}>Open File</button>
        </div>
      ) : (
        <div className="preview-container">
          {renderFilePreview()}
          <button onClick={() => setFileContent(null)}>Close Preview</button>
        </div>
      )}
    </div>
  );
}