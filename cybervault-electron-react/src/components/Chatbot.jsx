import Tesseract from 'tesseract.js';
import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { getCasualQaResponse, isFileRelatedQuestion } from './casualQa';

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
	if (!type) return 'FILE';
	if (type.startsWith('image/')) return 'IMG';
	if (type === 'application/pdf') return 'PDF';
	if (type.startsWith('text/')) return 'TXT';
	if (type.startsWith('video/')) return 'VID';
	if (type.startsWith('audio/')) return 'AUD';
	if (type.includes('zip') || type.includes('rar')) return 'ZIP';
	return 'DOC';
};

// Helper: Format file size
const formatFileSize = (bytes) => {
	if (!bytes) return '0 B';
	const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const decodeXmlEntities = (value = '') => value
	.replace(/&amp;/g, '&')
	.replace(/&lt;/g, '<')
	.replace(/&gt;/g, '>')
	.replace(/&quot;/g, '"')
	.replace(/&apos;/g, "'")
	.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
	.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));

const normalizeHttpUrl = (raw = '') => {
	let s = String(raw || '').trim();
	if (!s) return null;
	s = s.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/^[<(\[]+|[>)\].,;:!?]+$/g, '');
	if (!s) return null;
	if (/^mailto:/i.test(s)) return null;
	if (/^www\./i.test(s)) s = `https://${s}`;
	if (!/^https?:\/\//i.test(s)) {
		if (/^[a-z0-9-]+(\.[a-z0-9-]+)+([/:?#].*)?$/i.test(s)) {
			s = `https://${s}`;
		} else {
			return null;
		}
	}
	try {
		const u = new URL(s);
		if (!/^https?:$/i.test(u.protocol)) return null;
		if (!u.hostname || !/\./.test(u.hostname)) return null;
		if (/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)) return null;
		return u.toString();
	} catch {
		return null;
	}
};

const extractLinksFromText = (text = '') => {
	const links = new Set();
	const regex = /\bhttps?:\/\/[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s<>"'`)\]]*)?/gi;
	let match;
	while ((match = regex.exec(text)) !== null) {
		const clean = normalizeHttpUrl(match[0]);
		if (clean) links.add(clean);
	}
	return Array.from(links);
};

const readU16 = (arr, offset) => arr[offset] | (arr[offset + 1] << 8);
const readU32 = (arr, offset) => (arr[offset] | (arr[offset + 1] << 8) | (arr[offset + 2] << 16) | (arr[offset + 3] << 24)) >>> 0;

const inflateRaw = async (bytes) => {
	const ds = new DecompressionStream('deflate-raw');
	const stream = new Blob([bytes]).stream().pipeThrough(ds);
	const buf = await new Response(stream).arrayBuffer();
	return new Uint8Array(buf);
};

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
	const reader = new FileReader();
	reader.onload = () => resolve(String(reader.result || ''));
	reader.onerror = reject;
	reader.readAsDataURL(blob);
});

const extractDocxTextAndLinks = async (arrayBuffer) => {
	const bytes = new Uint8Array(arrayBuffer);
	const sigEOCD = 0x06054b50;
	const sigCD = 0x02014b50;
	const sigLocal = 0x04034b50;

	let eocd = -1;
	for (let i = Math.max(0, bytes.length - 65557); i <= bytes.length - 22; i += 1) {
		if (readU32(bytes, i) === sigEOCD) eocd = i;
	}
	if (eocd === -1) throw new Error('Invalid DOCX container');

	const cdSize = readU32(bytes, eocd + 12);
	const cdOffset = readU32(bytes, eocd + 16);
	const decoder = new TextDecoder('utf-8');
	const entries = new Map();
	let p = cdOffset;
	const cdEnd = cdOffset + cdSize;

	while (p < cdEnd && readU32(bytes, p) === sigCD) {
		const compression = readU16(bytes, p + 10);
		const compSize = readU32(bytes, p + 20);
		const nameLen = readU16(bytes, p + 28);
		const extraLen = readU16(bytes, p + 30);
		const commentLen = readU16(bytes, p + 32);
		const localOffset = readU32(bytes, p + 42);
		const nameStart = p + 46;
		const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLen));
		entries.set(name, { compression, compSize, localOffset });
		p += 46 + nameLen + extraLen + commentLen;
	}

	const readEntry = async (name) => {
		const entry = entries.get(name);
		if (!entry) return null;
		const local = entry.localOffset;
		if (readU32(bytes, local) !== sigLocal) return null;
		const localNameLen = readU16(bytes, local + 26);
		const localExtraLen = readU16(bytes, local + 28);
		const dataStart = local + 30 + localNameLen + localExtraLen;
		const payload = bytes.subarray(dataStart, dataStart + entry.compSize);
		if (entry.compression === 0) return payload;
		if (entry.compression === 8) return await inflateRaw(payload);
		return null;
	};

	const xmlFiles = [
		'word/document.xml',
		'word/header1.xml',
		'word/header2.xml',
		'word/header3.xml',
		'word/footer1.xml',
		'word/footer2.xml',
		'word/footer3.xml',
		'word/footnotes.xml',
		'word/endnotes.xml',
		'word/comments.xml',
	];
	const relationFiles = [
		'word/_rels/document.xml.rels',
		'word/_rels/header1.xml.rels',
		'word/_rels/header2.xml.rels',
		'word/_rels/header3.xml.rels',
		'word/_rels/footer1.xml.rels',
		'word/_rels/footer2.xml.rels',
		'word/_rels/footer3.xml.rels',
	];

	const chunks = [];
	const links = new Set();

	for (const name of xmlFiles) {
		const content = await readEntry(name);
		if (!content) continue;
		const xml = decoder.decode(content);
		const normalized = xml
			.replace(/<w:tab[^>]*\/>/g, '\t')
			.replace(/<w:br[^>]*\/>/g, '\n')
			.replace(/<\/w:p>/g, '\n');
		const text = decodeXmlEntities(normalized.replace(/<[^>]+>/g, ' ')).replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
		if (text) chunks.push(text);
		extractLinksFromText(xml).forEach((l) => links.add(l));
	}

	for (const relName of relationFiles) {
		const relContent = await readEntry(relName);
		if (!relContent) continue;
		const relText = decoder.decode(relContent);
		const targetRegex = /Target="(https?:\/\/[^"]+)"/gi;
		let m;
		while ((m = targetRegex.exec(relText)) !== null) {
			links.add(decodeXmlEntities(m[1]));
		}
	}

	const merged = chunks.join('\n\n').trim();
	return { text: merged, links: Array.from(links) };
};

const Chatbot = ({ files, open, onClose, idbGet, deriveQuantumKey, enc, dec, generateChecksum, ensureMasterPassword, showNotification }) => {
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState('');
	const [currentFile, setCurrentFile] = useState(null);
	const [ocrText, setOcrText] = useState('');
	const [isExtracting, setIsExtracting] = useState(false);
	const [extractError, setExtractError] = useState('');
	const [isThinking, setIsThinking] = useState(false);
	const [isListening, setIsListening] = useState(false);
	const [useFileContext, setUseFileContext] = useState(false);
	const [ocrQuery, setOcrQuery] = useState('');
	const [ocrLinks, setOcrLinks] = useState([]);
	const [isChatOpen, setIsChatOpen] = useState(false);
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
				if (ocrType === 'text' && !((f.type || '').startsWith('text/') || f.type === 'application/msword' || f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || /\.docx?$/i.test(f.name || ''))) return false;
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

	const toggleSelectFile = async (file) => {
		if (currentFile?.id === file?.id) {
			setCurrentFile(null);
			setOcrText('');
			setOcrLinks([]);
			setExtractError('');
			setMessages([{ sender: 'bot', text: 'File unselected. Pick another file to extract text.' }]);
			return;
		}
		await selectOcrFile(file);
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

	const extractTextWithVision = async (imageDataUrl) => {
		if (window.electronAPI?.googleOcrExtractText) {
			const googleRes = await window.electronAPI.googleOcrExtractText({ imageDataUrl });
			if (!googleRes?.error) {
				const txt = (googleRes?.data?.text || '').trim();
				if (txt) return txt;
			}
		}
		return '';
	};

	// Extract text from file (OCR for images, direct for text)
	const extractTextFromFile = async (file) => {
		setIsExtracting(true);
		setOcrText('');
		setOcrLinks([]);
		setExtractError('');
		let text = '';
		const foundLinks = new Set();
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
				let ocrTextResult = '';
				try {
					const dataUrl = await blobToDataUrl(imgBlob);
					const visionText = await extractTextWithVision(dataUrl);
					if (visionText) ocrTextResult = visionText;
				} catch {}
				if (!ocrTextResult) {
					const { data: { text: tesseractText } } = await Tesseract.recognize(
						imgUrl,
						'eng',
						{ logger: () => {} }
					);
					ocrTextResult = tesseractText;
				}
				URL.revokeObjectURL(imgUrl);
				text = ocrTextResult;
			}

			// 3. If PDF, extract text from every page with hybrid pipeline
			if (!text && file.type && file.type === 'application/pdf') {
				showNotification('> running.ocr.on.pdf', 'info');
				const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
				let mergedPdfText = '';
				const useVision = Boolean(window.electronAPI?.googleOcrExtractText);
				for (let i = 1; i <= pdf.numPages; i++) {
					showNotification(`> processing.pdf.page.${i}.of.${pdf.numPages}`, 'info');
					const page = await pdf.getPage(i);
					const content = await page.getTextContent();
					const embeddedLine = content.items.map(item => item.str).join(' ').trim();
					const annotations = await page.getAnnotations();
					annotations.forEach((a) => {
						if (a?.url) {
							const clean = normalizeHttpUrl(a.url);
							if (clean) foundLinks.add(clean);
						}
						if (a?.unsafeUrl) {
							const clean = normalizeHttpUrl(a.unsafeUrl);
							if (clean) foundLinks.add(clean);
						}
					});

					let bestPageText = embeddedLine;
					const viewport = page.getViewport({ scale: useVision ? 2.8 : 2.2 });
					const canvas = document.createElement('canvas');
					const context = canvas.getContext('2d');
					canvas.width = viewport.width;
					canvas.height = viewport.height;
					await page.render({ canvasContext: context, viewport }).promise;
					const dataUrl = canvas.toDataURL('image/png');

					let visionText = '';
					if (useVision) {
						try {
							visionText = await extractTextWithVision(dataUrl);
						} catch {}
					}
					if (visionText && visionText.length > (embeddedLine?.length || 0) * 1.15) {
						bestPageText = visionText;
					}

					if (!bestPageText || bestPageText.length < 30) {
						const { data: { text: pageText } } = await Tesseract.recognize(dataUrl, 'eng', {
							logger: () => {},
							tessedit_pageseg_mode: 6,
							preserve_interword_spaces: '1',
						});
						if (pageText && pageText.length > (bestPageText?.length || 0)) {
							bestPageText = pageText.trim();
						}
					}

					if (bestPageText) mergedPdfText += bestPageText.trim() + '\n\n';
				}
				text = mergedPdfText.trim();
			}

			// 4. DOCX extraction
			if (!text && (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || /\.docx$/i.test(file.name || ''))) {
				showNotification('> parsing.docx.document', 'info');
				const docxResult = await extractDocxTextAndLinks(buffer);
				text = docxResult.text || '';
				(docxResult.links || []).forEach((l) => {
					const clean = normalizeHttpUrl(l);
					if (clean) foundLinks.add(clean);
				});
			}

			// 5. Legacy DOC: best-effort text decode
			if (!text && (file.type === 'application/msword' || /\.doc$/i.test(file.name || ''))) {
				showNotification('> parsing.legacy.doc.best.effort', 'info');
				const raw = dec.decode(buffer);
				text = raw.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ').replace(/\s{2,}/g, ' ').trim();
			}

			const normalized = (text || '').trim();
			if (normalized) {
				const mergedLinks = new Set([...foundLinks, ...extractLinksFromText(normalized)]);
				const linksArr = Array.from(mergedLinks);
				setOcrText(normalized);
				setOcrLinks(linksArr);
				if (linksArr.length > 0) {
					showNotification(`> external.links.detected.${linksArr.length}`, 'success');
				}
			} else {
				setOcrText('[No extractable text found]');
				setOcrLinks([]);
			}

		} catch (err) {
			console.error("Extraction error:", err);
			setExtractError(err.message || 'Extraction failed');
			setOcrText('');
		} finally {
			setIsExtracting(false);
		}
	};


	// Hybrid routing:
	// 1) Common casual questions -> local response bank
	// 2) Other questions -> AI
	// 3) File-context questions -> AI with extracted text context
	const handleSend = async () => {
		const userInput = input.trim();
		if (!userInput) return;
		const userMessage = { sender: 'user', text: userInput };
		setMessages((prev) => [...prev, userMessage]);
		setInput('');
		const recentConversation = [...messages.slice(-6), userMessage]
			.map((msg) => {
				const role = msg.sender === 'user' ? 'User' : 'Assistant';
				const text = String(msg.text || '').replace(/\s+/g, ' ').trim().slice(0, 220);
				return text ? `${role}: ${text}` : '';
			})
			.filter(Boolean)
			.join('\n');

		if (!useFileContext) {
			const casual = getCasualQaResponse(userInput);
			if (casual) {
				setTimeout(() => {
					setMessages((prev) => [
						...prev,
						{ sender: 'bot', text: casual.response, category: 'casual', casualCategory: casual.category },
					]);
				}, 180);
				return;
			}
		}

		const fileQuery = useFileContext || isFileRelatedQuestion(userInput);

		const webGroqAnswer = async (reqPayload) => {
			const response = await fetch('/api/groq-ocr-answer', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(reqPayload || {}),
			});
			let json = null;
			try {
				json = await response.json();
			} catch {
				json = null;
			}
			if (!response.ok) {
				throw new Error(json?.detail || `HTTP ${response.status}`);
			}
			if (!json || typeof json !== 'object') {
				throw new Error('Invalid API response');
			}
			return json;
		};

		const aiHandlers = [
			{ name: 'groq', fn: window.electronAPI?.groqOcrAnswer },
			{ name: 'legacy', fn: window.electronAPI?.openaiOcrAnswer },
			{ name: 'web-groq', fn: !window.electronAPI ? webGroqAnswer : null },
		].filter((h) => typeof h.fn === 'function');
		if (!aiHandlers.length) {
			setMessages((prev) => [...prev, { sender: 'bot', text: 'AI handler is unavailable in this runtime.', category: 'ai' }]);
			return;
		}

		try {
			setIsThinking(true);

			const invokeAiWithFallback = async (reqPayload) => {
				let lastError = null;
				for (const handler of aiHandlers) {
					try {
						const res = await handler.fn(reqPayload);
						if (res?.error) {
							if (res.error === 'missing_api_key') throw new Error('Groq API key not configured');
							if (res.error === 'api_error' && res.detail) throw new Error(`API error: ${res.detail}`);
							if (res.detail) throw new Error(`${res.error}: ${res.detail}`);
							throw new Error(res.error);
						}
						return res;
					} catch (err) {
						lastError = err;
						const msg = String(err?.message || err || '');
						const missingGroqHandler = /no handler registered/i.test(msg) && /groq-ocr-answer/i.test(msg);
						if (handler.name === 'groq' && missingGroqHandler) continue;
						break;
					}
				}
				if (lastError) throw lastError;
				throw new Error('AI handler invocation failed');
			};

			let aiQuestion = userInput;
			if (fileQuery) {
				if (!currentFile) {
					setMessages((prev) => [...prev, { sender: 'bot', text: 'Select a file first for file-based questions.', category: 'ocr' }]);
					return;
				}
				if (!ocrText || !ocrText.trim()) {
					setMessages((prev) => [...prev, { sender: 'bot', text: 'Please run OCR on the selected file first.', category: 'ocr' }]);
					return;
				}
				const clippedText = ocrText.length > 12000 ? ocrText.slice(0, 12000) : ocrText;
				aiQuestion = `You are answering from the selected file context. Use recent chat context for follow-up questions like "which one", "that", or "he".
Recent chat:
${recentConversation || 'User: ' + userInput}

Use only this extracted text from the selected file as context.
Extracted text:
${clippedText}

Question: ${userInput}`;
			}

			const res = await invokeAiWithFallback({ question: aiQuestion });

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
			if (!out || !out.trim()) throw new Error('AI returned empty output');
			setMessages((prev) => [...prev, { sender: 'bot', text: out.trim(), category: fileQuery ? 'ocr' : 'ai' }]);
		} catch (err) {
			setMessages((prev) => [...prev, { sender: 'bot', text: `AI error: ${err.message}.`, category: 'ai' }]);
		} finally {
			setIsThinking(false);
		}
	};

	useEffect(() => {
		if (open) {
			setMessages([
				{ sender: 'bot', text: 'Welcome to the OCR section. Casual chat is local. For document questions, select a file and run OCR.' }
			]);
			setCurrentFile(null);
			setOcrText('');
			setOcrLinks([]);
			setIsChatOpen(false);
			setUseFileContext(false);
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
					<div className="ocr-header-actions">
						<button className="cyber-btn btn-secondary" onClick={() => {
							setIsChatOpen(true);
						}}>
							AI Chatbot
						</button>
						<button className="cyber-btn btn-danger" onClick={onClose}>Close</button>
					</div>
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
								<div className="ocr-picker-list ocr-picker-list-large">
									{filteredFiles.length === 0 ? (
										<div className="ocr-empty">No files match your search.</div>
									) : (
										filteredFiles.map((f) => (
											<div className="ocr-file-card" key={f.id || f.name}>
												<div
													className={`ocr-file-row ${currentFile?.id === f.id ? 'active' : ''}`}
													onClick={() => toggleSelectFile(f)}
													role="button"
													tabIndex={0}
													onKeyDown={(e) => {
														if (e.key === 'Enter' || e.key === ' ') {
															e.preventDefault();
															toggleSelectFile(f);
														}
													}}
												>
													<span className="ocr-file-icon">{getFileIcon(f.type)}</span>
													<span className="ocr-file-name">{f.name}</span>
													<span className="ocr-file-meta">{formatFileSize(f.size)}</span>
													<button
														className="cyber-btn btn-secondary ocr-select-btn"
														onClick={(e) => { e.stopPropagation(); toggleSelectFile(f); }}
													>
														{currentFile?.id === f.id ? 'Unselect' : 'Select'}
													</button>
												</div>
											</div>
										))
									)}
								</div>
							</div>

							{currentFile && (
								<div className="ocr-selected-details">
									<div className="ocr-panel-title">Selected File Details</div>
									<div className="ocr-meta">
										<div className="ocr-meta-row"><span>File</span><b>{currentFile.name}</b></div>
										<div className="ocr-meta-row"><span>Tags</span><b>{(currentFile.tags || []).join(', ') || '-'}</b></div>
										<div className="ocr-meta-row"><span>Type</span><b>{currentFile.type || 'unknown'}</b></div>
										<div className="ocr-meta-row"><span>Size</span><b>{formatFileSize(currentFile.size)}</b></div>
										<div className="ocr-meta-row"><span>Uploaded</span><b>{currentFile.uploadDate ? new Date(currentFile.uploadDate).toLocaleDateString() : 'N/A'}</b></div>
									</div>
								</div>
							)}

							<div className="ocr-actions ocr-actions-stacked">
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
					</div>

					<div className="ocr-right">
						<div className="ocr-panel ocr-right-panel">
							<div className="ocr-panel-title">Extracted Text (Full)</div>
							<div className="ocr-preview ocr-preview-full">
								{ocrText ? (
									<div style={{ whiteSpace: 'pre-wrap' }}>{ocrText}</div>
								) : (
									<div className="ocr-muted">No text extracted yet.</div>
								)}
							</div>
						</div>
						<div className="ocr-panel ocr-right-panel">
							<div className="ocr-panel-title">External Links {ocrLinks.length ? `(${ocrLinks.length})` : ''}</div>
							{ocrLinks.length ? (
								<div className="ocr-links-list">
									{ocrLinks.map((link, idx) => (
										<a key={`${link}-${idx}`} href={link} target="_blank" rel="noreferrer" className="ocr-link-item">{link}</a>
									))}
								</div>
							) : (
								<div className="ocr-muted">No external links found in this document.</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{isChatOpen && (
				<div className="ocr-chatbot-overlay">
					<div className="ocr-chatbot-modal">
						<div className="ocr-header">
							<div className="ocr-title">
								<span className="ocr-icon">AI</span>
								<div>
									<div className="ocr-title-text">Neural OCR Chatbot</div>
									<div className="ocr-subtitle">Ask questions about extracted content</div>
								</div>
							</div>
							<button className="cyber-btn btn-danger" onClick={() => setIsChatOpen(false)}>Close</button>
						</div>
						<div className="ocr-chatbot-body">
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
										className="form-input ocr-chat-input"
										placeholder={
											useFileContext
												? (currentFile ? 'Context mode ON: ask from selected file...' : 'Context mode ON: select a file and run OCR first...')
												: (currentFile ? 'Ask anything about this file...' : 'Ask anything... (select a file for file-grounded answers)')
										}
										value={input}
										onChange={e => setInput(e.target.value)}
										onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
										rows="3"
										disabled={isExtracting}
									/>
									<div className="ocr-chat-actions">
										<button
											onClick={isListening ? stopListening : startListening}
											className="cyber-btn btn-primary ocr-voice-btn"
											title={isListening ? 'Stop voice input' : 'Speak your question'}
											disabled={isThinking}
										>
											{isListening ? 'Stop Voice' : 'Voice'}
										</button>
										<div className="ocr-chat-actions-row">
											<button
												onClick={() => setUseFileContext((prev) => !prev)}
												className={`cyber-btn ${useFileContext ? 'btn-primary' : 'btn-secondary'} ocr-context-btn`}
												title="Toggle file context mode"
												disabled={isExtracting || isThinking}
											>
												{useFileContext ? 'Context: On' : 'Context: Off'}
											</button>
											<button
												onClick={handleSend}
												className="cyber-btn btn-secondary ocr-send-btn"
												disabled={isExtracting || !input.trim() || isThinking}
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
				</div>
			)}
		</div>
	);
};
export default Chatbot;


