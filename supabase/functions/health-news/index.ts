// supabase/functions/health-news/index.ts

import { withKeyRotation } from '../_shared/keyRotator.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const CACHE_TTL_MINUTES = 24 * 60 // 1 day

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query = 'health news today', type = 'news' } = await req.json()
    const cacheKey = `${type}::${query}`

    // 1️⃣ CACHE CHECK
    const { data: cached } = await supabase
      .from('tavily_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (cached) {
      console.log(`✅ Cache HIT: ${cacheKey}`)
      supabase
        .from('tavily_cache')
        .update({ hit_count: (cached.hit_count || 0) + 1 })
        .eq('cache_key', cacheKey)
        .then(() => {})
      return json(cached.payload)
    }

    console.log(`⚠️ Cache MISS: ${cacheKey} — calling Tavily`)

    // 2️⃣ TAVILY WITH ROTATION
    const searchQuery = buildQuery(query, type)

    const items = await withKeyRotation('TAVILY', async (key) => {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: key,
          query: searchQuery,
          search_depth: 'basic',
          include_answer: false,
          include_images: false,
          max_results: 8,
          topic: 'news',
          days: 7,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        const err: any = new Error(`Tavily ${res.status}: ${errText}`)
        err.status = res.status
        throw err
      }

      const data = await res.json()
      return (data.results || []).map((r: any) => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.slice(0, 220) || '',
        source: extractSource(r.url),
        publishedDate: r.published_date || null,
      }))
    })

    const payload: any = { news: items }
    if (type === 'trending') payload.topics = items

    // 3️⃣ SAVE TO CACHE
    const expiresAt = new Date(
      Date.now() + CACHE_TTL_MINUTES * 60 * 1000
    ).toISOString()

    await supabase.from('tavily_cache').upsert({
      cache_key: cacheKey,
      payload,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })

    console.log(`💾 Cached: ${cacheKey} (expires ${expiresAt})`)

    if (Math.random() < 0.1) {
      supabase.rpc('cleanup_tavily_cache').then(() => {})
    }

    return json(payload)
  } catch (err: any) {
    console.error('health-news error:', err)
    return json({ error: err.message || 'News failed', news: [] }, 500)
  }
})

function buildQuery(query: string, type: string) {
  switch (type) {
    case 'trending': return 'trending health topics 2026'
    case 'nutrition': return 'nutrition diet healthy eating research'
    case 'experts': return 'health expert advice medical insights'
    case 'personalized': return 'personalized health tips'
    default: return query
  }
}

function extractSource(url: string) {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return 'unknown'
  }
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}