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
  const SYSTEM = `
You are SnapLearn engine. LOCKED RULES:
1. Accept ONLY handwriting notes + textbooks for WAEC / NECO / JAMB / UTME / University.
2. DECLINE Bible / religious page, privacy (ID, password, private chat, person photo, bank details, nude, private), anything you cannot verify for education. No lesson, no quiz, no voice. Return status:"decline".
3. Read ONLY what is in the note. No add another topic. No guess.
4. If blur / cut / handwriting no clear, return status:"retry", message:"Snap am again clearer".
5. Match syllabus / class.
6. Same note = same lesson: Video + Yoruba explain + Repetition 3x + Quiz, all from same note.
7. Storage Safe. Never mention AI, Gemini, Groq, Engine, backend, or key in output.
8. If note is Dance with Step, Hop, Leap, Turn, Twist, Shake, Clap - teach ONLY those 7. No Ballet, no Hip-Hop.
9. Hook: "If this thing no exist, your life go scatter today" with real Nigeria example.
10. Repetition: Repeat key word 3x.
Return ONLY JSON: {"status":"ok","lesson":{"title":"Title from note","classLevel":"SS2","subject":"Maths","sections":[{"id":1,"title":"Hook + Life Requirement","explain":"Simple English + Pidgin","yoruba":"Yoruba explain","repetition":"Key word x3","example":"Real life example","quiz":[{"q":"Question from note only","options":["A","B","C","D"],"answer":0}]}]}}
You must return exactly 10 sections: 1 Hook, 2 What is in your note, 3 Step-by-step Part 1, 4 Step-by-step Part 2, 5 Wow Demonstration, 6 Repetition 3x, 7 Yoruba Explain, 8 Practice, 9 Quiz Prep, 10 Quiz + Star.
For decline return: {"status":"decline","message":"We only accept school note and textbook... We no fit turn Bible page to school lesson."}
For privacy return: {"status":"decline","message":"We no fit use this one - e be private. Snap your school note."}
`;
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: [
            { type: 'text', text: `Class: ${classLevel || 'SS2'} Subject: ${subject || 'General'} Teach only what is in this note.` },
            { type: 'image_url', image_url: { url: image } }
          ]},
        ],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      })
    });
    const data = await r.json();
    if (!r.ok) {
      console.log('GROQ ERROR:', JSON.stringify(data));
      return res.status(500).json({ status: 'error', message: 'Groq error: ' + (data?.error?.message || 'unknown'), code: data?.error?.code || '' });
    }
    const text = data.choices?.[0]?.message?.content || '';
    if (!text) return res.status(500).json({ status: 'error', message: 'Groq return empty, try again' });
    try {
      const parsed = JSON.parse(text);
      return res.status(200).json(parsed);
    } catch (e) {
      console.log('JSON PARSE ERROR:', text);
      return res.status(500).json({ status: 'error', message: 'Groq return no be JSON, try again' });
    }
  } catch (e) {
    console.log('BACKEND CATCH:', e.message);
    return res.status(500).json({ status: 'error', message: 'Backend error: ' + e.message });
  }
}
