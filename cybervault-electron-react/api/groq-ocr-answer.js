const flattenContentToText = (content) => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part) return '';
        if (typeof part === 'string') return part;
        if (typeof part?.text === 'string') return part.text;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  if (content && typeof content?.text === 'string') return content.text;
  return '';
};

const normalizeMessages = (rawInput) => {
  if (!rawInput) return [];
  if (!Array.isArray(rawInput)) {
    const text = flattenContentToText(rawInput);
    return text ? [{ role: 'user', content: text }] : [];
  }
  return rawInput
    .map((msg) => {
      const role = ['system', 'user', 'assistant'].includes(msg?.role) ? msg.role : 'user';
      const content = flattenContentToText(msg?.content);
      return content ? { role, content } : null;
    })
    .filter(Boolean);
};

const extractQuestionFromLegacyInput = (rawInput) => {
  const msgs = normalizeMessages(rawInput);
  if (!msgs.length) return '';
  return String(msgs[msgs.length - 1]?.content || '').trim();
};

const parseBody = (body) => {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  if (typeof body === 'object') return body;
  return {};
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(200).json({ error: 'missing_api_key' });

    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const payload = parseBody(req.body);
    const question = String(payload?.question || '').trim() || extractQuestionFromLegacyInput(payload?.input);
    if (!question) return res.status(200).json({ error: 'invalid_payload', detail: 'No question provided.' });

    const messages = [
      {
        role: 'system',
        content:
          'You are CyberVault assistant. Answer clearly and concisely. If question refers to selected file context, use the provided context exactly.',
      },
      { role: 'user', content: question.slice(0, 24000) },
    ];

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 650,
      }),
    });

    if (!groqRes.ok) {
      const detail = await groqRes.text();
      return res.status(200).json({ error: 'api_error', detail });
    }

    const data = await groqRes.json();
    const output = String(data?.choices?.[0]?.message?.content || '').trim();
    if (!output) return res.status(200).json({ error: 'api_error', detail: 'Empty response from model.' });

    return res.status(200).json({ data: { output_text: output } });
  } catch (error) {
    return res.status(200).json({ error: 'exception', detail: String(error?.message || error || 'unknown_error') });
  }
}
