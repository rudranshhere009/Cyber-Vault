import React, { useState, useRef, useEffect } from 'react';

// Helper functions moved to top level
const readAndDecryptFileContent = async (file, { idbGet, deriveQuantumKey, enc, dec, generateChecksum, ensureMasterPassword, showNotification }) => {
  try {
      showNotification(`> decrypting.${file.name} for analysis`, 'info');
      const pwd = await ensureMasterPassword(); // This will prompt user if needed
      if (!pwd) {
          showNotification('> neural.key.required.for.decryption', 'error');
          return null;
      }

      const key = await deriveQuantumKey(pwd, new Uint8Array(file.salt));
      const ciphertext = file.encryptedData ? new Uint8Array(file.encryptedData) : new Uint8Array(await idbGet(file.dataId));
      const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: new Uint8Array(file.iv) },
          key,
          ciphertext
      );
      const checksum = await generateChecksum(decrypted);
      if (checksum !== file.checksum) {
          throw new Error('File integrity verification failed');
      }

      // Attempt to decode as text
      try {
          const textContent = dec.decode(new Uint8Array(decrypted));
          showNotification(`> ${file.name}.decrypted.for.analysis`, 'success');
          return textContent;
      } catch (decodeErr) {
          // If it's not valid UTF-8, it's likely not a text file
          showNotification(`> ${file.name}.is.not.a.text.file`, 'info');
          return null; // Indicate it's not text
      }

  } catch (err) {
      console.error("Decryption or read error:", err);
      if (err.name === 'OperationError') {
          showNotification('> decryption.failed.invalid.neural.key', 'error');
      } else if (err.message === 'cancelled') {
          showNotification('> decryption.cancelled', 'info');
      } else {
          showNotification(`> decryption.failed.${err.message}`, 'error');
      }
      return null;
  }
};

const getFileInfoResponse = async (input, file, { readAndDecryptFileContent, idbGet, deriveQuantumKey, enc, dec, generateChecksum, ensureMasterPassword, showNotification }) => {
  const lowerInput = input.toLowerCase();

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (lowerInput.includes('size')) {
    return { sender: 'bot', text: `The size of "${file.name}" is ${formatFileSize(file.size)}.` };
  }
  if (lowerInput.includes('type')) {
    return { sender: 'bot', text: `The type of "${file.name}" is ${file.type || 'unknown'}.` };
  }
  if (lowerInput.includes('upload date') || lowerInput.includes('when uploaded')) {
    return { sender: 'bot', text: `"${file.name}" was uploaded on ${new Date(file.uploadDate).toLocaleDateString()}.` };
  }
  if (lowerInput.includes('checksum')) {
    return { sender: 'bot', text: `The checksum of "${file.name}" is ${file.checksum}.` };
  }
  if (lowerInput.includes('all info') || lowerInput.includes('details')) {
    return { sender: 'bot', text: `Here are the details for "${file.name}":
Size: ${formatFileSize(file.size)}
Type: ${file.type || 'unknown'}
Upload Date: ${new Date(file.uploadDate).toLocaleDateString()}
Checksum: ${file.checksum}` };
  }

  // Handle content-related questions
  if (lowerInput.includes('read') || lowerInput.includes('content') || lowerInput.includes('summarize') || lowerInput.includes('tell me about')) {
      const fileContent = await readAndDecryptFileContent(file, { idbGet, deriveQuantumKey, enc, dec, generateChecksum, ensureMasterPassword, showNotification }); // Pass dependencies
      if (fileContent) {
          // Simple summarization for now, can be improved later
          const summary = fileContent.substring(0, 500) + (fileContent.length > 500 ? '...' : '');
          return { sender: 'bot', text: `Here's what I found in "${file.name}":

${summary}

(Note: This is a partial view. For full content, please download the file.)` };
      } else {
          return { sender: 'bot', text: `I cannot display the content of "${file.name}" directly as it might not be a text file or an error occurred during decryption. You can download it to view its full content.` };
      }
  }

  return { sender: 'bot', text: `What else would you like to know about "${file.name}"? You can ask about its size, type, upload date, checksum, or ask me to "read" its content. Type "exit" to go back.` };
};


const getBotResponse = (input, files) => {
  const lowerInput = input.toLowerCase();

  // Helper to check for keywords
  const containsKeywords = (text, keywords) => keywords.some(keyword => text.includes(keyword));

  // File-related questions
  if (containsKeywords(lowerInput, ['how many files', 'number of files', 'file count', 'no. of files'])) {
    return { sender: 'bot', text: `You have ${files.length} files in your vault.` };
  }

  // New: Handle general file listing/information
  if (containsKeywords(lowerInput, ['existing files', 'all files', 'my files', 'what files do i have', 'list files'])) {
      if (files.length === 0) {
          return { sender: 'bot', text: 'You currently have no files in your vault.' };
      } else {
          const fileNames = files.map(f => f.name).join(', ');
          return { sender: 'bot', text: `You have ${files.length} files in your vault: ${fileNames}.` };
      }
  }

  if (containsKeywords(lowerInput, ['show me', 'list', 'display']) && containsKeywords(lowerInput, ['files'])) {
    let response = 'I can list files by type. What type of files are you looking for (e.g., PDF, image, text)?';
    const fileTypes = ['pdf', 'image', 'text', 'video', 'audio', 'zip', 'json', 'xml', 'exe'];
    for (const type of fileTypes) {
      if (lowerInput.includes(type)) {
        const filteredFiles = files.filter(f => f.type.toLowerCase().includes(type));
        if (filteredFiles.length > 0) {
          response = `Here are your ${type} files: ${filteredFiles.map(f => f.name).join(', ')}`;
        } else {
          response = `I couldn't find any ${type} files.`;
        }
        break;
      }
    }
    return { sender: 'bot', text: response };
  }

  if (containsKeywords(lowerInput, ['size of', 'how big is'])) {
    const fileNameMatch = lowerInput.match(/(size of|how big is) (.*)/);
    if (fileNameMatch && fileNameMatch[2]) {
      const fileName = fileNameMatch[2].trim();
      const file = files.find(f => f.name.toLowerCase().includes(fileName));
      if (file) {
        const formatFileSize = (bytes) => {
          if (bytes === 0) return '0 B';
          const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        return { sender: 'bot', text: `The size of ${file.name} is ${formatFileSize(file.size)}.` };
      }
      return { sender: 'bot', text: `I couldn't find a file named ${fileName}.` };
    }
    return { sender: 'bot', text: 'Please specify the file name when asking about its size.' };
  }

  if (containsKeywords(lowerInput, ['when did i upload', 'upload date of'])) {
    const fileNameMatch = lowerInput.match(/(when did i upload|upload date of) (.*)/);
    if (fileNameMatch && fileNameMatch[2]) {
      const fileName = fileNameMatch[2].trim();
      const file = files.find(f => f.name.toLowerCase().includes(fileName));
      if (file) {
        return { sender: 'bot', text: `You uploaded ${file.name} on ${new Date(file.uploadDate).toLocaleDateString()}.` };
      }
      return { sender: 'bot', text: `I couldn't find a file named ${fileName}.` };
    }
    return { sender: 'bot', text: 'Please specify the file name when asking about its upload date.' };
  }

  // Cybersecurity questions
  const cyberSecurityResponses = {
    'phishing': 'Phishing is a type of social engineering attack often used to steal user data, including login credentials and credit card numbers. It occurs when an attacker, masquerading as a trusted entity, dupes a victim into opening an email, instant message, or text message.',
    'strong password': 'A strong password is a password that is difficult for a person or a computer program to guess. It should be at least 12 characters long and contain a mix of uppercase and lowercase letters, numbers, and symbols. Avoid using easily guessable information like birthdays or names.',
    'two-factor authentication': 'Two-factor authentication (2FA) is a security process in which users provide two different authentication factors to verify themselves. This process is done to better protect both the user\'s credentials and the resources the user can access. It adds an extra layer of security beyond just a password.',
    'malware': 'Malware is a catch-all term for malicious software, including viruses, ransomware, spyware, and other unwanted programs that gain access to your system. Always use antivirus software and be careful about what you download.',
    'ransomware': 'Ransomware is a type of malware that encrypts your files and demands a ransom, usually in cryptocurrency, for their decryption. To protect yourself, regularly back up your data and be wary of suspicious emails or links.',
    'firewall': 'A firewall is a network security system that monitors and controls incoming and outgoing network traffic based on predetermined security rules. It acts as a barrier between a trusted internal network and untrusted outside networks, such as the internet.',
    'vpn': 'A VPN (Virtual Private Network) creates a secure, encrypted connection over a less secure network, like the internet. It allows you to browse the web privately and securely, and can bypass geo-restrictions.',
    'encryption': 'Encryption is the process of converting information or data into a code, especially to prevent unauthorized access. It\'s a fundamental aspect of cybersecurity, ensuring data confidentiality and integrity.',
    'cybersecurity tips': 'Always keep your software updated, use strong and unique passwords, enable two-factor authentication, be cautious of suspicious links or attachments, and regularly back up your important data.',
    'data breach': 'A data breach is a security incident in which sensitive, protected, or confidential data is copied, transmitted, viewed, stolen, or used by an individual unauthorized to do so. It can lead to identity theft and financial fraud.',
    };

    for (const key in cyberSecurityResponses) {
      if (lowerInput.includes(key)) {
        return { sender: 'bot', text: cyberSecurityResponses[key] };
      }
    }

    return { sender: 'bot', text: 'I am THOR, a cybersecurity-focused chatbot. I can answer questions about your files and common cybersecurity topics. How can I help you? You can also ask me "about my files" to get started with file-related questions.' };
  };


const Chatbot = ({ files, open, onClose, idbGet, deriveQuantumKey, enc, dec, generateChecksum, ensureMasterPassword, showNotification }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const [conversationState, setConversationState] = useState('initial'); // initial, awaiting_filename, file_info_mode
  const [currentFile, setCurrentFile] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    if (open) {
      setMessages([
        {
          sender: 'bot',
          text: 'Welcome to THOR, your cybersecurity assistant. What can I help you with today? You can ask me about your files or general cybersecurity topics.'
        }
      ]);
      setConversationState('initial');
      setCurrentFile(null);
    }
  }, [open]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      sender: 'user',
      text: input,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    // New logic to detect direct file queries
    const lowerInput = input.toLowerCase();
    const fileQueryMatch = lowerInput.match(/(tell me about|what is in|summarize)\s+(.*)/);

    if (fileQueryMatch && fileQueryMatch[2]) {
        const potentialFileName = fileQueryMatch[2].trim();
        const file = files.find(f => f.name.toLowerCase().includes(potentialFileName.toLowerCase()));

        if (file) {
            // If a file is found, set conversation state and current file, then proceed to get file info
            setConversationState('file_info_mode');
            setCurrentFile(file);
            setTimeout(async () => {
                const botResponse = await getFileInfoResponse(input, file, { readAndDecryptFileContent, idbGet, deriveQuantumKey, enc, dec, generateChecksum, ensureMasterPassword, showNotification }); // Pass dependencies
                setMessages(prevMessages => [...prevMessages, botResponse]);
            }, 500);
            return; // Exit handleSend, as we've handled the direct query
        }
    }

    // Original setTimeout block starts here
    setTimeout(async () => { // Make this async
      let botResponse;
      if (conversationState === 'awaiting_filename') {
        const fileName = input.trim();
        const file = files.find(f => f.name.toLowerCase() === fileName.toLowerCase());
        if (file) {
          setCurrentFile(file);
          setConversationState('file_info_mode');
          botResponse = { sender: 'bot', text: 'Okay, I\'m now in file information mode for "' + file.name + '". What would you like to know about it? (e.g., "size", "type", "upload date", "checksum", "read content", or "exit" to go back)' };
        } else {
          botResponse = { sender: 'bot', text: `I couldn't find a file named "${fileName}". Please try again or type "exit" to go back to general questions.` };
        }
      }
      else if (conversationState === 'file_info_mode') {
        botResponse = await getFileInfoResponse(input, currentFile, { readAndDecryptFileContent, idbGet, deriveQuantumKey, enc, dec, generateChecksum, ensureMasterPassword, showNotification }); // Pass dependencies
        if (input.toLowerCase() === 'exit') {
          setConversationState('initial');
          setCurrentFile(null);
          botResponse = { sender: 'bot', text: 'Exiting file information mode. What else can I help you with?' };
        }
      } else { // initial state
        botResponse = getBotResponse(input, files); // No extra dependencies needed here
        if (input.toLowerCase().includes('about my files')) {
          setConversationState('awaiting_filename');
          botResponse = { sender: 'bot', text: 'Okay, which file are you interested in? Please type the exact file name.' };
        }
      }
      setMessages(prevMessages => [...prevMessages, botResponse]);
    }, 500);
  };

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'linear-gradient(145deg, var(--glass-bg), rgba(15, 15, 25, 0.95))', border: '1px solid var(--border-glow)', borderRadius: 16, padding: 16, width: 600, height: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 0 50px rgba(0, 212, 255, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-glow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>⚡</span>
            <h2 className="neural-title" style={{ fontSize: 24, margin: 0 }}>THOR</h2>
          </div>
          <button className="cyber-btn btn-danger" onClick={onClose}>Close</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((msg, index) => (
            <div key={index} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              <div style={{ background: msg.sender === 'user' ? 'var(--primary-purple)' : 'var(--glass-bg)', color: 'white', padding: '10px 15px', borderRadius: 15, border: msg.sender === 'bot' ? '1px solid var(--border-glow)' : 'none' }}>
                {msg.text}
              </div>
            </div>
          ))}
              <div ref={messagesEndRef} />
        </div>
        <div style={{ display: 'flex', gap: 10, paddingTop: 10, borderTop: '1px solid var(--border-glow)' }}>
          <textarea
            className="form-input"
            placeholder={conversationState === 'awaiting_filename' ? 'Enter file name...' : 'Ask THOR a question...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            rows="3" // Added rows for initial height
            style={{ flex: 1, margin: 0, resize: 'vertical' }} // Allow vertical resize
          />
        </div>
      </div>
    </div>
  );
};

export default Chatbot;