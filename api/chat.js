// ============================================================
//  Hire Me Bot — Vercel Serverless Function
//  CommonJS format (module.exports) — most compatible
// ============================================================

module.exports = async function handler(req, res) {

  // ── CORS Headers ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ── Preflight ──
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const { messages, system } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    // ── Build Gemini messages (system ko first user message mein prepend karo) ──
    const geminiMessages = messages.map((msg, i) => {
      if (i === 0 && system) {
        return {
          role: 'user',
          parts: [{ text: `${system}\n\n---\n\nUser: ${msg.content}` }]
        };
      }
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      };
    });

    // ── Gemini API Call ──
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.json();
      console.error('Gemini error:', err);
      return res.status(geminiRes.status).json({ error: 'Gemini API error', details: err });
    }

    const data = await geminiRes.json();

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
      || "Sorry, I couldn't generate a response right now.";

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};
