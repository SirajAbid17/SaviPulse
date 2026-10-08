import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase env vars missing. Check .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

/* ============ EDGE FUNCTION CALLS ============ */
export async function callChatAI(message, history = []) {
  const { data, error } = await supabase.functions.invoke('chat-ai', {
    body: { message, history },
  })
  if (error) throw new Error(error.message || 'Chat failed')
  return data
}

export async function callHealthNews(query = 'health news today') {
  const { data, error } = await supabase.functions.invoke('health-news', {
    body: { query },
  })
  if (error) throw new Error(error.message || 'News failed')
  return data
}