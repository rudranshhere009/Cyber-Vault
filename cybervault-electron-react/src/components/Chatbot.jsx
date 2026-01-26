import Tesseract from 'tesseract.js';
import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for pdf.js
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url
  ).toString();
} catch (error) {
  console.error("Failed to set PDF.js worker source:", error);
}


// Helper: Decrypt file and return ArrayBuffer
const getDecryptedFileBuffer = async (file, { idbGet, deriveQuantumKey, generateChecksum, ensureMasterPassword, showNotification }) => {
	try {
		showNotification(`> decrypting.${file.name} for analysis`, 'info');
		const pwd = await ensureMasterPassword();
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
        return decrypted;
	} catch (err) {
		showNotification(`> decryption.failed.${err.message}`, 'error');
		return null;
	}
};


// Helper: Get file icon by type
const getFileIcon = (type) => {
	if (!type) return '📄';
	if (type.startsWith('image/')) return '🖼️';
	if (type === 'application/pdf') return '📕';
	if (type.startsWith('text/')) return '📄';
	if (type.startsWith('video/')) return '🎞️';
	if (type.startsWith('audio/')) return '🎵';
	if (type.includes('zip') || type.includes('rar')) return '🗜️';
	return '📁';
};

// Helper: Format file size
const formatFileSize = (bytes) => {
	if (!bytes) return '0 B';
	const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const Chatbot = ({ files, open, onClose, idbGet, deriveQuantumKey, enc, dec, generateChecksum, ensureMasterPassword, showNotification }) => {
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState('');
	const [currentFile, setCurrentFile] = useState(null);
	const [ocrText, setOcrText] = useState('');
	const [isExtracting, setIsExtracting] = useState(false);
	const [isListening, setIsListening] = useState(false);
	const messagesEndRef = useRef(null);
	const recognitionRef = useRef(null);

	// Voice input (speech-to-text)
	const startListening = () => {
		if (!('webkitSpeechRecognition' in window)) {
			alert('Speech recognition not supported in this browser.');
			return;
		}
		const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
		const recognition = new SpeechRecognition();
		recognition.lang = 'en-US';
		recognition.interimResults = false;
		recognition.maxAlternatives = 1;
		recognition.onresult = (event) => {
			const transcript = event.results[0][0].transcript;
			setInput(transcript);
			setIsListening(false);
		};
		recognition.onerror = () => setIsListening(false);
		recognition.onend = () => setIsListening(false);
		recognitionRef.current = recognition;
		setIsListening(true);
		recognition.start();
	};
	const stopListening = () => {
		if (recognitionRef.current) recognitionRef.current.stop();
		setIsListening(false);
	};

	// Voice output (text-to-speech)
	const speak = (text) => {
		if (!('speechSynthesis' in window)) {
			alert('Text-to-speech not supported in this browser.');
			return;
		}
		const utterance = new window.SpeechSynthesisUtterance(text);
		utterance.lang = 'en-US';
		window.speechSynthesis.speak(utterance);
	};

	// Extract text from file (OCR for images, direct for text)
	const extractTextFromFile = async (file) => {
		setIsExtracting(true);
		setOcrText('');
		let text = '';
		try {
			const buffer = await getDecryptedFileBuffer(file, { idbGet, deriveQuantumKey, generateChecksum, ensureMasterPassword, showNotification });

			if (!buffer) {
				throw new Error('Could not decrypt file.');
			}

			// 1. Try to decode as text
			if (file.type && file.type.startsWith('text/')) {
				try {
					text = dec.decode(buffer);
					showNotification(`> ${file.name}.decrypted.for.analysis`, 'success');
				} catch (e) {
					// Not a valid text file, proceed to other methods
				}
			}

			// 2. If image, use OCR
			if (!text && file.type && file.type.match(/image\/(png|jpeg|jpg|bmp|gif)/i)) {
				showNotification('> running.ocr.on.image', 'info');
				const { data: { text: ocrTextResult } } = await Tesseract.recognize(
					buffer,
					'eng',
					{ logger: m => {/* Optionally log progress */} }
				);
				text = ocrTextResult;
			}

			// 3. If PDF, use pdf.js
			if (!text && file.type && file.type === 'application/pdf') {
				showNotification('> running.ocr.on.pdf', 'info');
				const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
				let pdfText = '';
				for (let i = 1; i <= pdf.numPages; i++) {
					const page = await pdf.getPage(i);
					const content = await page.getTextContent();
					pdfText += content.items.map(item => item.str).join(' ') + '\n';
				}
				text = pdfText;
			}

			if (text) {
				setOcrText(text);
			} else {
				setOcrText('[Unsupported file type for text extraction]');
			}

		} catch (err) {
			console.error("Extraction error:", err);
			setOcrText(`[Error extracting text: ${err.message}]`);
		} finally {
			setIsExtracting(false);
		}
	};


	// Q&A logic: Thor answers based on ocrText
	const handleSend = async () => {
		if (!input.trim() || !ocrText) return;
		const userMessage = { sender: 'user', text: input };
		setMessages((prev) => [...prev, userMessage]);
		setInput('');
		// Improved Q&A logic
		let answer = '';
		const lowerInput = input.toLowerCase();
		if (lowerInput.includes('summary') || lowerInput.includes('summarize') || lowerInput.includes('context') || lowerInput.includes('what is inside') || lowerInput.includes('about the file')) {
			// Try to generate a factual summary
			if (!ocrText.trim()) {
				answer = 'The file appears to be empty or could not be read.';
			} else {
				// Use first lines as a summary, but phrase it nicely
				const lines = ocrText.split(/\r?\n/).filter(Boolean);
				let summary = '';
				if (lines.length > 1) {
					summary = lines.slice(0, 3).join(' ');
				} else {
					summary = ocrText.slice(0, 300);
				}
				answer = `Summary of the file:\n\n${summary}${ocrText.length > 300 ? '...' : ''}`;
			}
		} else if (lowerInput.includes('content') || lowerInput.includes('show')) {
			answer = ocrText.length > 1000 ? ocrText.slice(0, 1000) + '...' : ocrText;
		} else {
			// Improved keyword search: find best matching sentence
			const sentences = ocrText.split(/(?<=[.!?])\s+/);
			const keyword = input.trim().toLowerCase();
			const found = sentences.find(s => s.toLowerCase().includes(keyword));
			if (found) {
				answer = 'Found: ' + found.trim();
			} else {
				answer = 'Sorry, I could not find anything relevant in the file.';
			}
		}
		setTimeout(() => {
			setMessages((prev) => [...prev, { sender: 'bot', text: answer }]);
		}, 500);
	};

	useEffect(() => {
		if (open) {
			setMessages([
				{ sender: 'bot', text: 'Welcome to the OCR section. Select a file from your vault to extract and analyze its text. You can then ask questions about the file.' }
			]);
			setCurrentFile(null);
			setOcrText('');
			setInput('');
		}
	}, [open]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	if (!open) return null;

	return (
		<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
			<div style={{ background: 'linear-gradient(145deg, var(--glass-bg), rgba(15, 15, 25, 0.95))', border: '1px solid var(--border-glow)', borderRadius: 16, padding: 16, width: 650, height: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 0 50px rgba(0, 212, 255, 0.2)' }}>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border-glow)' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
						<span style={{ fontSize: 24 }}>📝</span>
						<h2 className="neural-title" style={{ fontSize: 24, margin: 0 }}>OCR</h2>
					</div>
					<button className="cyber-btn btn-danger" onClick={onClose}>Close</button>
				</div>
				{/* File selection UI with icons and metadata */}
				<div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
					<span style={{ fontWeight: 600 }}>Select file:</span>
					<select
						className="form-input"
						value={currentFile ? currentFile.name : ''}
						onChange={async e => {
							const file = files.find(f => f.name === e.target.value);
							setCurrentFile(file);
							setMessages([{ sender: 'bot', text: `Extracting text from "${file.name}"...` }]);
							await extractTextFromFile(file);
							setMessages([{ sender: 'bot', text: `Text extracted from "${file.name}". You can now ask questions about this file.` }]);
						}}
						style={{ minWidth: 200 }}
					>
						<option value="">-- Select a file --</option>
						{files.map(f => (
							<option key={f.name} value={f.name}>
								{getFileIcon(f.type)} {f.name}
							</option>
						))}
					</select>
					{currentFile && (
						<span style={{ color: '#0cf', fontSize: 13 }}>
							{getFileIcon(currentFile.type)} <b>{currentFile.name}</b> | {currentFile.type || 'unknown'} | {formatFileSize(currentFile.size)} | Uploaded: {currentFile.uploadDate ? new Date(currentFile.uploadDate).toLocaleDateString() : 'N/A'}
						</span>
					)}
					{isExtracting && <span style={{ color: '#0cf' }}>Extracting...</span>}
				</div>
				{/* OCR text preview (optional, for debug) */}
				{ocrText && (
					<div style={{ background: 'rgba(0,0,0,0.3)', color: '#0cf', padding: 8, borderRadius: 8, marginBottom: 8, maxHeight: 120, overflowY: 'auto', fontSize: 13 }}>
						<b>Extracted Text Preview:</b>
						<div style={{ whiteSpace: 'pre-wrap' }}>{ocrText.slice(0, 500)}{ocrText.length > 500 ? '...' : ''}</div>
					</div>
				)}
				{/* Q&A chat UI */}
				<div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
					{messages.map((msg, index) => (
						<div key={index} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
							<div style={{ background: msg.sender === 'user' ? 'var(--primary-purple)' : 'var(--glass-bg)', color: 'white', padding: '10px 15px', borderRadius: 15, border: msg.sender === 'bot' ? '1px solid var(--border-glow)' : 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
								{msg.text}
								{msg.sender === 'bot' && (
									<button onClick={() => speak(msg.text)} style={{ background: 'none', border: 'none', color: '#0cf', cursor: 'pointer', marginLeft: 6 }} title="Listen">
										🔊
									</button>
								)}
							</div>
						</div>
					))}
					<div ref={messagesEndRef} />
				</div>
				<div style={{ display: 'flex', gap: 10, paddingTop: 10, borderTop: '1px solid var(--border-glow)' }}>
					<textarea
						className="form-input"
						placeholder={currentFile ? 'Ask about the selected file...' : 'Select a file to start...'}
						value={input}
						onChange={e => setInput(e.target.value)}
						onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
					
rows="3"
					style={{ flex: 1, margin: 0, resize: 'vertical' }}
					disabled={!currentFile || isExtracting}
					/>
					<button
						onClick={isListening ? stopListening : startListening}
						className="cyber-btn"
						style={{ minWidth: 44, fontSize: 22, background: isListening ? '#0cf' : 'var(--primary-purple)', color: 'white', border: 'none', borderRadius: 8 }}
						title={isListening ? 'Stop voice input' : 'Speak your question'}
					>
						{isListening ? '🛑' : '🎤'}
					</button>
				</div>
			</div>
		</div>
	);
};

export default Chatbot;