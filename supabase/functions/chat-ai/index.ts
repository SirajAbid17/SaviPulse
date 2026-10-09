// supabase/functions/chat-ai/index.ts

import { withKeyRotation } from '../_shared/keyRotator.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const GROQ_MODEL = 'openai/gpt-oss-20b'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, history = [] } = await req.json()

    if (!message || typeof message !== 'string') {
      return json({ error: 'Message is required' }, 400)
    }

    const systemPrompt = `You are SaviPulse, a friendly AI health assistant.

Rules:
- Give short, clear, empathetic health guidance.
- Never diagnose definitively; suggest seeing a doctor when needed.
- If symptoms sound like an emergency (chest pain, difficulty breathing, severe bleeding, stroke signs, suicide thoughts), set emergency=true.
- Reply in the same language the user writes (English / Urdu / Roman Urdu).
- Keep answers under 200 words unless the user asks for detail.
- Use bullet points for clarity when helpful.

Return STRICT JSON only (no markdown, no code fences):
{"text": "your reply here", "emergency": false}`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      })),
      { role: 'user', content: message },
    ]

    const data = await withKeyRotation('GROQ', async (key) => {
      const res = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages,
            temperature: 0.7,
            max_tokens: 1024,
            response_format: { type: 'json_object' },
          }),
        }
      )

      if (!res.ok) {
        const errText = await res.text()
        const err: any = new Error(`Groq ${res.status}: ${errText}`)
        err.status = res.status
        throw err
      }

      const json_ = await res.json()
      const raw = json_?.choices?.[0]?.message?.content || ''

      let parsed: any = { text: raw, emergency: false }
      try {
        parsed = JSON.parse(raw)
      } catch {}

      return {
        text: parsed.text || raw || 'Sorry, I could not generate a reply.',
        emergency: !!parsed.emergency,
      }
    })

    return json(data)
  } catch (err: any) {
    console.error('chat-ai error:', err)
    return json({ error: err.message || 'Chat failed' }, 500)
  }
})

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}