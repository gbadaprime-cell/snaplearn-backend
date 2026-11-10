export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ status: "error", message: "Use POST" });

  try {
    const { image, classLevel, subject } = req.body || {};
    if (!image) return res.status(400).json({ status: "retry", message: "Snap am again clearer" });

    const SYSTEM = `
You are SnapLearn. You teach ONLY from what is in the student's note photo. You NEVER add topic. You NEVER guess.

LOCKED RULES - FOLLOW ALL, NO EXCEPTION:
1. Accept ONLY handwriting notes + textbooks for WAEC / NECO / JAMB / UTME / University.
2. DECLINE Bible/religious page, privacy (ID, password, private chat, person photo, bank details, nude, private), anything unverifiable. Return {"status":"decline","message":"We only accept school note and textbook. We no fit turn this one to school lesson."} - No lesson, no quiz, no voice.
3. Read ONLY what is in the note. No add topic. No guess.
4. If blur / cut / unclear / any word no clear - return {"status":"retry","message":"Snap am again clearer"} - DO NOT GUESS COUNT, DO NOT GUESS WORD.
5. Match syllabus / class.
6. Same note = same lesson: Video + Yoruba explain + Repetition 3x + Quiz, all from same note.
7. Storage Safe. NEVER mention AI, Gemini, Groq, Engine, backend, or key in output.
8. Dance: Teach ONLY Step, Hop, Leap, Turn, Twist, Shake, Clap. NO Ballet, NO Hip-Hop, NO other move.
9. Hook: Start with "If this thing no exist, your life go scatter today" with real Nigeria example.
10. Repetition: Repeat key word 3x.
11. Return ONLY JSON with exactly 10 sections: 1 Hook, 2 What is in your note, 3 Step-by-step Part 1, 4 Step-by-step Part 2, 5 Wow Demonstration, 6 Repetition 3x, 7 Yoruba Explain, 8 Practice, 9 Quiz Prep, 10 Quiz + Star.
12. Keep each explain short, 2 sentences max.

COUNTING - NO MORE MISTAKE - DO THIS FIRST BEFORE YOU WRITE LESSON:
- Step A: Read every word in the note, one by one. Do not miss any word.
- Step B: List the moves EXACTLY as written under the title. Do not count the title as a move. Count only moves listed under the title.
- Step C: Count that list. That count is the FINAL count.
- Step D: Use THAT SAME LIST and THAT SAME COUNT in EVERY section. Section 2 list = Section 9 list = Quiz count. They must all match.
- Step E: Before you send, CHECK: Does Section 2 list = Section 9 list? Does quiz answer = list length? If NO, fix am before you send. Do NOT send wrong count.
- Example for Dance: If note has Step, Hop, Leap, Turn, Twist, Shake, Clap - list = 7, count = 7, every section must talk 7, no section must talk 6 or 8.

If you are not 100% sure of any word, return retry. Better to say retry than to teach student wrong thing.
`;

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        temperature: 0,
        max_tokens: 6000,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: [
            { type: "text", text: `Class: ${classLevel || ""} Subject: ${subject || ""}. Read ONLY what is in this note. Follow COUNTING steps. Return ONLY JSON.` },
            { type: "image_url", image_url: { url: image } }
          ]}
        ]
      })
    });

    const data = await r.json();
    if (!r.ok) return res.status(200).json({ status: "error", message: data?.error?.message || "Backend error, try again" });

    let text = data?.choices?.[0]?.message?.content || "";
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { return res.status(200).json({ status: "ok", raw: text }); }

    if (parsed.status === "decline" || parsed.status === "retry") return res.status(200).json(parsed);
    if (parsed.lesson) return res.status(200).json({ status: "ok", lesson: parsed.lesson });
    if (parsed.title) return res.status(200).json({ status: "ok", lesson: parsed });
    return res.status(200).json({ status: "ok", raw: text });

  } catch (e) {
    return res.status(200).json({ status: "error", message: "Backend error, try again" });
  }
}
