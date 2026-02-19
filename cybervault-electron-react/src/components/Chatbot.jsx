import Tesseract from 'tesseract.js';
import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

// Set worker source for pdf.js
	pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;


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
	const hasElectron = Boolean(window.electronAPI);
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState('');
	const [currentFile, setCurrentFile] = useState(null);
	const [ocrText, setOcrText] = useState('');
	const [isExtracting, setIsExtracting] = useState(false);
	const [extractError, setExtractError] = useState('');
	const [isThinking, setIsThinking] = useState(false);
	const [isListening, setIsListening] = useState(false);
	const [ocrQuery, setOcrQuery] = useState('');
	const ocrSearchRef = useRef(null);
	const [ocrType, setOcrType] = useState('all');
	const messagesEndRef = useRef(null);
	const recognitionRef = useRef(null);

	const filteredFiles = React.useMemo(() => {
		const q = ocrQuery.trim().toLowerCase();
		return files.filter(f => {
			if (ocrType !== 'all') {
				if (ocrType === 'pdf' && f.type !== 'application/pdf') return false;
				if (ocrType === 'image' && !(f.type || '').startsWith('image/')) return false;
				if (ocrType === 'text' && !(f.type || '').startsWith('text/')) return false;
			}
			if (!q) return true;
			return f.name.toLowerCase().includes(q);
		});
	}, [files, ocrQuery, ocrType]);

	const selectOcrFile = async (file) => {
		setCurrentFile(file);
		if (file) {
			setMessages([{ sender: 'bot', text: `Extracting text from "${file.name}"...` }]);
			await extractTextFromFile(file);
			setMessages([{ sender: 'bot', text: `Text extracted from "${file.name}". You can now ask questions about this file.` }]);
		}
	};

	// Tagging helpers
	const getFileTags = async (file) => {
		if (!hasElectron) return file.tags || [];
		try {
			const idx = await window.electronAPI.readVaultIndex();
			const entry = (idx && idx.files && file.id) ? idx.files[file.id] : null;
			return (entry && entry.tags) ? entry.tags : (file.tags || []);
		} catch (e) { return file.tags || []; }
	};

	const promptAddTag = async (file) => {
		if (!hasElectron) {
			showNotification('> tag.update.unavailable.in.web.mode', 'error');
			return;
		}
		const tag = prompt('Add a tag for ' + file.name + ' (comma-separated for multiple)');
		if (!tag) return;
		const tags = tag.split(',').map(t => t.trim()).filter(Boolean);
		try {
			const idx = (await window.electronAPI.readVaultIndex()) || {};
			idx.files = idx.files || {};
			const key = file.id || file.name;
			idx.files[key] = idx.files[key] || {};
			idx.files[key].tags = Array.from(new Set([...(idx.files[key].tags || []), ...tags]));
			await window.electronAPI.writeVaultIndex(idx);
			showNotification('> tags.updated', 'success');
		} catch (e) { showNotification('> tags.update.failed', 'error'); }
	};

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
		setExtractError('');
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
				const imgBlob = new Blob([buffer], { type: file.type || 'image/png' });
				const imgUrl = URL.createObjectURL(imgBlob);
				const { data: { text: ocrTextResult } } = await Tesseract.recognize(
					imgUrl,
					'eng',
					{ logger: m => {/* Optionally log progress */} }
				);
				URL.revokeObjectURL(imgUrl);
				text = ocrTextResult;
			}

			// 3. If PDF, use pdf.js text extraction (fallback to OCR if empty)
			if (!text && file.type && file.type === 'application/pdf') {
				showNotification('> running.ocr.on.pdf', 'info');
				const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
				let pdfText = '';
				for (let i = 1; i <= pdf.numPages; i++) {
					const page = await pdf.getPage(i);
					const content = await page.getTextContent();
					const line = content.items.map(item => item.str).join(' ').trim();
					if (line) pdfText += line + '\n';
				}
				text = pdfText;

				// If no extractable text, run OCR on first pages
				if (!text.trim()) {
					showNotification('> running.ocr.on.scanned.pdf', 'info');
					let ocrResult = '';
					const pagesToScan = Math.min(3, pdf.numPages);
					for (let i = 1; i <= pagesToScan; i++) {
						const page = await pdf.getPage(i);
						const viewport = page.getViewport({ scale: 2.0 });
						const canvas = document.createElement('canvas');
						const context = canvas.getContext('2d');
						canvas.width = viewport.width;
						canvas.height = viewport.height;
						await page.render({ canvasContext: context, viewport }).promise;
						const dataUrl = canvas.toDataURL('image/png');
						const { data: { text: pageText } } = await Tesseract.recognize(dataUrl, 'eng', { logger: m => {/* no-op */} });
						if (pageText && pageText.trim()) {
							ocrResult += pageText.trim() + '\n';
						}
					}
					text = ocrResult;
				}
			}

			const normalized = (text || '').trim();
			if (normalized) {
				setOcrText(text);
			} else {
				setOcrText('[No extractable text found]');
			}

		} catch (err) {
			console.error("Extraction error:", err);
			setExtractError(err.message || 'Extraction failed');
			setOcrText('');
		} finally {
			setIsExtracting(false);
		}
	};


	// Q&A logic: Thor answers based on ocrText
	const handleSend = async () => {
		if (!input.trim()) return;
		const userMessage = { sender: 'user', text: input };
		setMessages((prev) => [...prev, userMessage]);
		setInput('');
		if (!ocrText || !ocrText.trim()) {
			setTimeout(() => {
				setMessages((prev) => [...prev, { sender: 'bot', text: 'Please run OCR on a file first so I can answer questions about it.' }]);
			}, 300);
			return;
		}

		const systemPrompt = `You are CyberVault OCR assistant. Answer only using the provided extracted text. If the user asks for a specific section, return only that section. If the user asks for points/bullets, return bullet points. If you cannot find the answer, say so clearly. Keep answers concise and factual.`;
		const clippedText = ocrText.length > 12000 ? ocrText.slice(0, 12000) : ocrText;
		const userPrompt = `Extracted text:\n${clippedText}\n\nQuestion: ${input}`;

		if (window.electronAPI?.openaiOcrAnswer) {
			try {
				setIsThinking(true);
				const res = await window.electronAPI.openaiOcrAnswer({
					input: [
						{ role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
						{ role: 'user', content: [{ type: 'input_text', text: userPrompt }] },
					],
				});
				if (res?.error) {
					if (res.error === 'missing_api_key') throw new Error('OpenAI API key not configured');
					if (res.error === 'api_error' && res.detail) throw new Error(`API error: ${res.detail}`);
					throw new Error(res.error);
				}
				const data = res?.data;
				let out = '';
				if (data?.output_text) out = data.output_text;
				if (!out && Array.isArray(data?.output)) {
					for (const item of data.output) {
						if (Array.isArray(item?.content)) {
							for (const c of item.content) {
								if (c?.type === 'output_text' && c?.text) out += c.text;
							}
						}
					}
				}
				if (out && out.trim()) {
					setMessages((prev) => [...prev, { sender: 'bot', text: out.trim() }]);
					setIsThinking(false);
					return;
				}
			} catch (err) {
				setMessages((prev) => [...prev, { sender: 'bot', text: `AI error: ${err.message}. Falling back to local search.` }]);
			} finally {
				setIsThinking(false);
			}
		}
		const wantsBullets = /points|bullet|bullets|list|in points/i.test(input);
		const wantOnly = /only|just|specifically|particular|section/i.test(input);
		const sectionKey = (() => {
			const q = input.toLowerCase();
			if (q.match(/education|qualification|school|college|degree/)) return 'education';
			if (q.match(/experience|work|employment|internship|project/)) return 'experience';
			if (q.match(/skills|tech|stack|tools|languages/)) return 'skills';
			if (q.match(/certification|certificate/)) return 'certifications';
			if (q.match(/contact|email|phone|address/)) return 'contact';
			return null;
		})();
		const sectionKeys = (() => {
			const keys = [];
			const q = input.toLowerCase();
			if (q.match(/education|qualification|school|college|degree/)) keys.push('education');
			if (q.match(/experience|work|employment|internship|project/)) keys.push('experience');
			if (q.match(/skills|tech|stack|tools|languages/)) keys.push('skills');
			if (q.match(/certification|certificate/)) keys.push('certifications');
			if (q.match(/contact|email|phone|address/)) keys.push('contact');
			return Array.from(new Set(keys));
		})();

		const extractSectionText = (text, key) => {
			const keywords = {
				education: ['EDUCATION', 'QUALIFICATION', 'SCHOOL', 'COLLEGE', 'UNIVERSITY', 'DEGREE', 'B.TECH', 'DIPLOMA'],
				experience: ['EXPERIENCE', 'WORK', 'EMPLOYMENT', 'INTERNSHIP', 'PROJECT'],
				skills: ['SKILLS', 'TECH STACK', 'TECHNOLOGIES', 'LANGUAGES', 'TOOLS', 'FRAMEWORKS'],
				certifications: ['CERTIFICATION', 'CERTIFICATIONS', 'CERTIFICATE'],
				contact: ['CONTACT', 'EMAIL', 'PHONE', 'ADDRESS'],
			};
			const lines = text.split(/\r?\n/);
			const lineStarts = [];
			let offset = 0;
			for (const line of lines) {
				lineStarts.push(offset);
				offset += line.length + 1;
			}
			const upper = text.toUpperCase();
			const occurrences = [];
			Object.keys(keywords).forEach(k => {
				keywords[k].forEach(word => {
					let idx = upper.indexOf(word);
					while (idx !== -1) {
						const lineIdx = lineStarts.findIndex((s, i) => idx >= s && idx < (lineStarts[i + 1] ?? Infinity));
						occurrences.push({ key: k, idx, lineIdx });
						idx = upper.indexOf(word, idx + word.length);
					}
				});
			});
			if (!occurrences.length) return '';
			occurrences.sort((a, b) => a.idx - b.idx);
			const startOcc = occurrences.find(o => o.key === key);
			if (!startOcc) return '';
			const startLine = startOcc.lineIdx;
			const nextOcc = occurrences.find(o => o.lineIdx > startLine);
			const endLine = nextOcc ? nextOcc.lineIdx : lines.length;
			const sectionLines = lines.slice(startLine + 1, endLine).map(l => l.trim()).filter(Boolean);
			if (sectionLines.length) return sectionLines.join('\n').trim();
			const fallback = lines.map(l => l.trim()).filter(Boolean).filter(l => {
				const u = l.toUpperCase();
				return keywords[key].some(w => u.includes(w));
			});
			return fallback.join('\n').trim();
		};

		const formatBullets = (text) => {
			const byLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
			const splitLines = byLines.flatMap(l => l.split(/,|\s{2,}/).map(s => s.trim()).filter(Boolean));
			const bullets = splitLines.length ? splitLines : text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
			return bullets.slice(0, 10).map(b => `- ${b}`).join('\n');
		};

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
		} else if (lowerInput.includes('document name') || lowerInput.includes('file name') || lowerInput.includes('name of this document')) {
			answer = currentFile ? `The document name is: ${currentFile.name}` : 'No file is selected yet.';
		} else if (lowerInput.includes('content') || lowerInput.includes('show')) {
			answer = ocrText.length > 1000 ? ocrText.slice(0, 1000) + '...' : ocrText;
		} else if (sectionKeys.length) {
			const sections = sectionKeys.map(k => ({ key: k, text: extractSectionText(ocrText, k) }))
				.filter(s => s.text && s.text.length > 10);
			if (!sections.length) {
				answer = `I couldn't find the requested section(s) in this file.`;
			} else {
				answer = sections.map(s => {
					if (wantsBullets) {
						return `${s.key.toUpperCase()}:\n${formatBullets(s.text)}`;
					}
					if (wantOnly) {
						return `${s.key.toUpperCase()}:\n${s.text}`;
					}
					const short = s.text.split(/\r?\n/).slice(0, 6).join('\n');
					return `${s.key.toUpperCase()}:\n${short}`;
				}).join('\n\n');
			}
		} else {
			// Smarter match: score lines by keyword overlap
			const normalized = ocrText
				.replace(/\s+/g, ' ')
				.replace(/[^\w\s]/g, ' ')
				.toLowerCase();
			const lines = normalized.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
			const rawLines = ocrText.split(/\r?\n/).map(l => l.trim());
			const query = input.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
			const scoreLine = (line) => {
				let score = 0;
				for (const term of query) {
					if (term.length < 3) continue;
					if (line.includes(term)) score += 2;
				}
				return score;
			};
			let bestIdx = -1;
			let bestScore = 0;
			lines.forEach((l, i) => {
				const s = scoreLine(l);
				if (s > bestScore) { bestScore = s; bestIdx = i; }
			});
			if (bestScore > 0 && bestIdx !== -1) {
				const snippet = rawLines.slice(Math.max(0, bestIdx - 1), bestIdx + 2).join('\n');
				answer = `Relevant section:\n${snippet}`;
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
			setExtractError('');
		}
	}, [open]);

	// Keyboard shortcut: Ctrl+K focuses OCR search
	useEffect(() => {
		function onKey(e) {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				ocrSearchRef.current?.focus();
			}
		}
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, []);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	if (!open) return null;

	return (
		<div className="ocr-overlay">
			<div className="ocr-modal">
				<div className="ocr-header">
					<div className="ocr-title">
						<span className="ocr-icon" aria-hidden="true">
							<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
								<path d="M4 4h10l6 6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"></path>
								<path d="M14 4v6h6"></path>
								<path d="M7 14h10"></path>
								<path d="M7 18h7"></path>
							</svg>
						</span>
						<div>
							<div className="ocr-title-text">Neural OCR Studio</div>
							<div className="ocr-subtitle">Extract, review, and interrogate vault files with secure OCR</div>
						</div>
					</div>
					<button className="cyber-btn btn-danger" onClick={onClose}>Close</button>
				</div>

				<div className="ocr-body">
					<div className="ocr-left">
						<div className="ocr-panel">
							<div className="ocr-panel-title">Select File</div>
							<div className="ocr-picker">
								<div className="ocr-picker-controls">
									<input
										ref={ocrSearchRef}
										className="ocr-picker-input"
										aria-label="Search files for OCR"
										placeholder="Search files for OCR... (Ctrl+K)"
										value={ocrQuery}
										onChange={(e) => setOcrQuery(e.target.value)}
									/>
									<div className="ocr-picker-filters">
										{['all', 'pdf', 'image', 'text'].map((t) => (
											<button
												key={t}
												className={`ocr-filter ${ocrType === t ? 'active' : ''}`}
												onClick={() => setOcrType(t)}
											>
												{t.toUpperCase()}
											</button>
										))}
									</div>
								</div>
								<div className="ocr-picker-list">
									{filteredFiles.length === 0 ? (
										<div className="ocr-empty">No files match your search.</div>
									) : (
											filteredFiles.slice(0, 8).map(f => (
											<button
												key={f.id || f.name}
												className={`ocr-file-row ${currentFile?.id === f.id ? 'active' : ''}`}
												onClick={() => selectOcrFile(f)}
											>
												<span className="ocr-file-icon">{getFileIcon(f.type)}</span>
												<span className="ocr-file-name">{f.name}</span>
												<span className="ocr-file-meta">{formatFileSize(f.size)}</span>
												<button aria-label={`Add tag to ${f.name}`} className="cyber-btn btn-secondary" style={{marginLeft:8}} onClick={(e)=>{ e.stopPropagation(); promptAddTag(f); }}>🏷️</button>
											</button>
										))
									)}
								</div>
							</div>

							{currentFile && (
								<div className="ocr-meta">
									<div className="ocr-meta-row"><span>File</span><b>{currentFile.name}</b></div>
									<div className="ocr-meta-row"><span>Tags</span><b>{(currentFile.tags || []).join(', ') || '—'}</b></div>
									<div className="ocr-meta-row"><span>Type</span><b>{currentFile.type || 'unknown'}</b></div>
									<div className="ocr-meta-row"><span>Size</span><b>{formatFileSize(currentFile.size)}</b></div>
									<div className="ocr-meta-row"><span>Uploaded</span><b>{currentFile.uploadDate ? new Date(currentFile.uploadDate).toLocaleDateString() : 'N/A'}</b></div>
								</div>
							)}

							<div className="ocr-actions">
								<button className="cyber-btn btn-primary" onClick={() => currentFile && extractTextFromFile(currentFile)} disabled={!currentFile || isExtracting}>
									{isExtracting ? 'Extracting...' : 'Run OCR'}
								</button>
								<button className="cyber-btn btn-secondary" onClick={() => { navigator.clipboard?.writeText(ocrText || ''); showNotification('> ocr.text.copied', 'success'); }} disabled={!ocrText}>
									Copy Text
								</button>
								<button
									className="cyber-btn btn-secondary"
									onClick={() => {
										const blob = new Blob([ocrText || ''], { type: 'text/plain' });
										const url = URL.createObjectURL(blob);
										const a = document.createElement('a');
										a.href = url; a.download = `ocr_extract_${Date.now()}.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
									}}
									disabled={!ocrText}
								>
									Download TXT
								</button>
							</div>

							{extractError && <div className="ocr-error">OCR Error: {extractError}</div>}
						</div>

						<div className="ocr-panel">
							<div className="ocr-panel-title">Extracted Text Preview</div>
							<div className="ocr-preview">
								{ocrText ? (
									<div style={{ whiteSpace: 'pre-wrap' }}>{ocrText.slice(0, 1200)}{ocrText.length > 1200 ? '...' : ''}</div>
								) : (
									<div className="ocr-muted">No text extracted yet.</div>
								)}
							</div>
						</div>
					</div>

					<div className="ocr-right">
						<div className="ocr-panel ocr-chat">
							<div className="ocr-panel-title">Ask the Vault</div>
							<div className="ocr-messages">
								{messages.map((msg, index) => (
									<div key={index} className={`ocr-msg ${msg.sender === 'user' ? 'user' : 'bot'}`}>
										<span>{msg.text}</span>
										{msg.sender === 'bot' && (
											<button onClick={() => speak(msg.text)} className="ocr-tts" title="Listen">
												<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
													<path d="M11 5L6 9H3v6h3l5 4z"></path>
													<path d="M15 9a4 4 0 0 1 0 6"></path>
													<path d="M17.5 6.5a7 7 0 0 1 0 11"></path>
												</svg>
											</button>
										)}
									</div>
								))}
								<div ref={messagesEndRef} />
							</div>
							<div className="ocr-input-row">
								<textarea
									className="form-input"
									placeholder={currentFile ? 'Ask about the selected file...' : 'Select a file to start...'}
									value={input}
									onChange={e => setInput(e.target.value)}
									onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
									rows="3"
									disabled={!currentFile || isExtracting}
								/>
								<button
									onClick={isListening ? stopListening : startListening}
									className="cyber-btn btn-primary"
									title={isListening ? 'Stop voice input' : 'Speak your question'}
									disabled={isThinking}
								>
									{isListening ? (
										<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
											<rect x="6" y="6" width="12" height="12" rx="2"></rect>
										</svg>
									) : (
										<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
											<path d="M12 1v22"></path>
											<path d="M8 5a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0z"></path>
											<path d="M5 10a7 7 0 0 0 14 0"></path>
										</svg>
									)}
								</button>
								<button
									onClick={handleSend}
									className="cyber-btn btn-secondary"
									disabled={!currentFile || isExtracting || !input.trim() || isThinking}
									title="Send question"
								>
									{isThinking ? 'Thinking...' : 'Send'}
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Chatbot;
