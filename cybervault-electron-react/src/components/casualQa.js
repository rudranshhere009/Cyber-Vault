const normalizeInput = (value = '') =>
	String(value || '')
		.toLowerCase()
		.replace(/['"`]/g, '')
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

const formatNowTime = () =>
	new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatNowDate = () =>
	new Date().toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });

const formatNowDay = () =>
	new Date().toLocaleDateString([], { weekday: 'long' });

const CASUAL_INTENTS = [
	{
		category: 'greeting',
		response: 'Hello. I am here and ready to help.',
		questions: [
			'hi',
			'hello',
			'hey',
			'hey there',
			'hello there',
			'yo',
			'good morning',
			'good afternoon',
			'good evening',
			'hi bot',
			'hello bot',
			'hey bot',
		],
	},
	{
		category: 'greeting_followup',
		response: 'Yes, I am here. We can continue.',
		questions: [
			'hi again',
			'hello again',
			'are you there',
			'you there',
			'anyone there',
			'can you hear me',
			'can we chat',
			'lets chat',
			'ready to chat',
			'start chat',
			'start conversation',
			'can we talk',
		],
	},
	{
		category: 'wellbeing',
		response: 'I am running smoothly. Thanks for asking.',
		questions: [
			'how are you',
			'how are you doing',
			'how are you today',
			'hows it going',
			'are you okay',
			'are you doing well',
			'are you fine',
			'whats up',
			'sup',
			'how is your day',
			'all good',
			'you good',
		],
	},
	{
		category: 'bot_identity',
		response: 'I am the CyberVault OCR chatbot assistant.',
		questions: [
			'who are you',
			'what are you',
			'tell me about yourself',
			'introduce yourself',
			'what should i call you',
			'what is your name',
			'are you a bot',
			'are you ai',
			'are you real',
			'are you human',
			'who am i talking to',
			'what kind of assistant are you',
		],
	},
	{
		category: 'bot_purpose',
		response: 'I help you extract text from files and answer questions from extracted content.',
		questions: [
			'what do you do',
			'what can you do',
			'how can you help',
			'how do you help',
			'what is your purpose',
			'why are you here',
			'what is your job',
			'what are your skills',
			'what tasks can you handle',
			'can you answer questions',
			'can you read documents',
			'can you explain things',
		],
	},
	{
		category: 'app_identity',
		response: 'This is CyberVault, a secure vault app with OCR and document Q&A support.',
		questions: [
			'what is this app',
			'whats this app',
			'what app is this',
			'what is cyber vault',
			'whats cyber vault',
			'tell me about cyber vault',
			'what is cybervault',
			'what does cyber vault do',
			'why use this app',
			'what is this platform',
			'is this a vault app',
			'what is this software',
		],
	},
	{
		category: 'app_features',
		response: 'Core features include secure vault storage, OCR extraction, and chatbot Q&A on extracted text.',
		questions: [
			'what features do you have',
			'show app features',
			'main features',
			'key features',
			'what can i do here',
			'what can i store here',
			'can i upload files',
			'can i run ocr here',
			'can i search text',
			'can i ask questions on docs',
			'does this app support pdf',
			'does this app support images',
		],
	},
	{
		category: 'app_navigation',
		response: 'Start by selecting a file in OCR section, run extraction, then ask questions.',
		questions: [
			'how do i start',
			'where do i start',
			'how to use this',
			'how to use this app',
			'guide me',
			'quick guide',
			'first step',
			'what should i do first',
			'how do i run ocr',
			'how do i choose file',
			'how do i open ocr',
			'how do i ask document questions',
		],
	},
	{
		category: 'ask_permission',
		response: 'Yes, absolutely. Ask your question.',
		questions: [
			'can i ask something',
			'can i ask a question',
			'may i ask something',
			'can i ask you',
			'is it okay to ask',
			'can we continue',
			'can we proceed',
			'can i continue',
			'can you help me now',
			'can we do this',
			'shall i ask',
			'ready for questions',
		],
	},
	{
		category: 'thanks',
		response: 'You are welcome.',
		questions: [
			'thanks',
			'thank you',
			'thanks a lot',
			'thank you so much',
			'many thanks',
			'appreciate it',
			'great thanks',
			'cool thanks',
			'nice thanks',
			'thanks bot',
			'thank you bot',
			'thx',
		],
	},
	{
		category: 'apology',
		response: 'No problem. We can continue.',
		questions: [
			'sorry',
			'im sorry',
			'i am sorry',
			'my bad',
			'sorry about that',
			'oops sorry',
			'pardon me',
			'excuse me',
			'forgive me',
			'sry',
			'sorry bot',
			'apologies',
		],
	},
	{
		category: 'confirmation',
		response: 'Great. I am ready for your next question.',
		questions: [
			'ok',
			'okay',
			'alright',
			'cool',
			'nice',
			'sounds good',
			'got it',
			'understood',
			'makes sense',
			'perfect',
			'great',
			'fine',
		],
	},
	{
		category: 'time',
		response: () => `Current local time is ${formatNowTime()}.`,
		questions: [
			'what time is it',
			'whats the time',
			'current time',
			'tell me time',
			'time now',
			'can you tell the time',
			'do you know the time',
			'local time',
			'time please',
			'what is the time right now',
			'give me current time',
			'show time',
		],
	},
	{
		category: 'date',
		response: () => `Today is ${formatNowDate()}.`,
		questions: [
			'what is todays date',
			'whats todays date',
			'today date',
			'current date',
			'tell me date',
			'date today',
			'what date is it',
			'can you tell the date',
			'show date',
			'date please',
			'what is the date right now',
			'give me todays date',
		],
	},
	{
		category: 'day',
		response: () => `Today is ${formatNowDay()}.`,
		questions: [
			'what day is it',
			'which day is today',
			'today day',
			'current day',
			'tell me the day',
			'day today',
			'is it monday',
			'is it tuesday',
			'is it wednesday',
			'is it thursday',
			'is it friday',
			'is it weekend',
		],
	},
	{
		category: 'help_request',
		response: 'I can help. Select a file, run OCR, then ask me questions about extracted text.',
		questions: [
			'help',
			'i need help',
			'need help',
			'please help',
			'support',
			'can you help me',
			'assist me',
			'i am confused',
			'i am stuck',
			'how can i get help',
			'help me with app',
			'help me with ocr',
		],
	},
	{
		category: 'privacy',
		response: 'Security is a core goal in this app. Keep your keys and credentials protected on your side.',
		questions: [
			'is my data safe',
			'is this secure',
			'is this app secure',
			'do you store my data',
			'is my file private',
			'is ocr private',
			'is chat private',
			'is data encrypted',
			'how is data protected',
			'is this trusted',
			'can anyone see my file',
			'is my content shared',
		],
	},
	{
		category: 'upload_ocr',
		response: 'Open OCR section, select a file, click Run OCR, then use chat for questions.',
		questions: [
			'how to upload file',
			'how to add file',
			'how to scan document',
			'how to extract text',
			'how to run text extraction',
			'how to do ocr',
			'ocr steps',
			'pdf ocr steps',
			'image ocr steps',
			'how to copy extracted text',
			'how to download extracted text',
			'how to ask from extracted text',
		],
	},
	{
		category: 'compliments',
		response: 'Thanks. Glad that helps.',
		questions: [
			'good job',
			'great job',
			'nice work',
			'well done',
			'awesome',
			'amazing',
			'super',
			'you are helpful',
			'you are smart',
			'you are good',
			'excellent',
			'brilliant',
		],
	},
	{
		category: 'fallback_smalltalk',
		response: 'Yes, go ahead. I am listening.',
		questions: [
			'hello can i ask something',
			'hi can i ask something',
			'hey can i ask something',
			'can we talk for a minute',
			'lets start',
			'lets begin',
			'start please',
			'you free',
			'are you available',
			'online now',
			'can we chat now',
			'quick question',
		],
	},
	{
		category: 'farewell',
		response: 'Goodbye. I will be here when you need me.',
		questions: [
			'bye',
			'goodbye',
			'see you',
			'see ya',
			'talk to you later',
			'catch you later',
			'bye for now',
			'good night',
			'have a good day',
			'have a nice day',
			'i am done',
			'that is all',
		],
	},
	{
		category: 'creator_meta',
		response: 'I am a built-in assistant in CyberVault OCR section.',
		questions: [
			'who made you',
			'who built you',
			'who created you',
			'who developed you',
			'are you open source',
			'which model are you',
			'what tech are you built on',
			'are you connected to internet',
			'can you browse internet',
			'are you always online',
			'do you learn from me',
			'do you save chats',
		],
	},
];

const CASUAL_LOOKUP = new Map();
CASUAL_INTENTS.forEach((intent) => {
	intent.questions.forEach((q) => {
		CASUAL_LOOKUP.set(normalizeInput(q), intent);
	});
});

const CASUAL_PATTERN_HANDLERS = [
	{
		category: 'greeting',
		test: (n) => /^(hi|hello|hey|yo)\b/.test(n) || /\bgood (morning|afternoon|evening)\b/.test(n),
		response: 'Hello. I am here and ready to help.',
	},
	{
		category: 'ask_permission',
		test: (n) => /\b(can|may)\s+i\s+ask\b/.test(n) || /\bquick question\b/.test(n),
		response: 'Yes, absolutely. Ask your question.',
	},
	{
		category: 'bot_identity',
		test: (n) => /\bwho are you\b/.test(n) || /\bwhat are you\b/.test(n),
		response: 'I am the CyberVault OCR chatbot assistant.',
	},
	{
		category: 'bot_purpose',
		test: (n) => /\bwhat can you do\b/.test(n) || /\bwhat do you do\b/.test(n),
		response: 'I help with OCR extraction and document-based Q&A.',
	},
	{
		category: 'app_identity',
		test: (n) => /\bwhat( is|s)? this app\b/.test(n) || /\bcyber\s?vault\b/.test(n),
		response: 'CyberVault is a secure vault app with OCR and AI-assisted document chat.',
	},
	{
		category: 'time',
		test: (n) => /\b(time|clock)\b/.test(n) && /\b(what|whats|tell|current|now|show|give|local|please)\b/.test(n),
		response: () => `Current local time is ${formatNowTime()}.`,
	},
	{
		category: 'date',
		test: (n) => /\bdate\b/.test(n) && /\b(what|whats|tell|today|current|now|show|give|please)\b/.test(n),
		response: () => `Today is ${formatNowDate()}.`,
	},
	{
		category: 'day',
		test: (n) => /\b(what day|which day|weekday|weekend)\b/.test(n),
		response: () => `Today is ${formatNowDay()}.`,
	},
	{
		category: 'help_request',
		test: (n) => /\b(help|support|assist)\b/.test(n),
		response: 'I can help. Select a file, run OCR, then ask document questions.',
	},
	{
		category: 'thanks',
		test: (n) => /\b(thanks|thank you|thx|appreciate)\b/.test(n),
		response: 'You are welcome.',
	},
	{
		category: 'apology',
		test: (n) => /\b(sorry|apologies|my bad|pardon)\b/.test(n),
		response: 'No problem. We can continue.',
	},
	{
		category: 'compliments',
		test: (n) => /\b(good job|great job|nice work|well done|awesome|amazing|excellent|brilliant)\b/.test(n),
		response: 'Thanks. Glad that helps.',
	},
	{
		category: 'farewell',
		test: (n) => /\b(bye|goodbye|see you|later|good night)\b/.test(n),
		response: 'Goodbye. I will be here when you need me.',
	},
];

export const CASUAL_QUESTION_COUNT = CASUAL_INTENTS.reduce((acc, intent) => acc + intent.questions.length, 0);

export const getCasualQaResponse = (rawInput) => {
	const normalized = normalizeInput(rawInput);
	if (!normalized) return null;

	const direct = CASUAL_LOOKUP.get(normalized);
	if (direct) {
		return {
			type: 'casual',
			category: direct.category,
			response: typeof direct.response === 'function' ? direct.response() : direct.response,
		};
	}

	for (const handler of CASUAL_PATTERN_HANDLERS) {
		if (handler.test(normalized)) {
			return {
				type: 'casual',
				category: handler.category,
				response: typeof handler.response === 'function' ? handler.response() : handler.response,
			};
		}
	}

	return null;
};
