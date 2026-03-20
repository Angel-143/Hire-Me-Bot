// ============================================================
//  HIRE ME BOT — Vercel Serverless Function (FREE Backend)
//  File location: api/chat.js
//
//  FREE TIER: Vercel gives 100GB bandwidth + 100,000 function
//  invocations/month — more than enough for a portfolio!
//
//  HOW TO DEPLOY (5 minutes):
//  1. vercel-backend/ folder ko GitHub pe upload karo
//  2. vercel.com pe "Import Project" karo
//  3. Environment variable add karo: GEMINI_API_KEY = your key
//  4. Deploy! URL copy karo → index.html mein paste karo
// ============================================================

export default async function handler(req, res) {

  // ── CORS — allows your portfolio site to call this ──
  res.setHeader('Access-Control-Allow-Origin', '*');          // Change to your domain for security
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ── Handle browser preflight ──
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

    // ── Build prompt for Gemini ──
    // Gemini does not have a "system" role — prepend it to first user message
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

    // ── Call Gemini Flash-Lite (fastest + highest free quota: 1000 req/day) ──
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${process.env.GEMINI_API_KEY}`,
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

    // ── Extract reply text ──
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
      || "Sorry, I couldn't generate a response right now.";

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}