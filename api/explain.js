export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ status: 'error', message: 'Use POST' });
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ status: 'error', message: 'Key no dey for server' });
  const { image, classLevel, subject } = req.body || {};
  if (!image) return res.status(400).json({ status: 'error', message: 'No image' });
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
        messages: [
          { role: 'system', content: 'You are SnapLearn. Read ONLY what is in the note. No add topic. If Bible or privacy, say DECLINE. If blur, say RETRY. Return JSON only.' },
          { role: 'user', content: [
            { type: 'text', text: 'Class: ' + (classLevel || 'SS2') + ' Subject: ' + (subject || 'General') + ' Teach only what is in this note. Return JSON.' },
            { type: 'image_url', image_url: { url: image } }
          ] }
        ],
        temperature: 0.2,
        max_tokens: 2000
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ status: 'error', message: 'Groq error: ' + (data?.error?.message || 'unknown') });
    const text = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ status: 'ok', raw: text });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: 'Backend error: ' + e.message });
  }
}
