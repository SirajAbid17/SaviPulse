import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase env vars missing. Check .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

const RECORDS_BUCKET = 'records'

/* =========================================
   IMAGE → BASE64 HELPER
========================================= */
async function urlToDataURL(imageUrl) {
  console.log('📸 Fetching image:', imageUrl)
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`Failed to load image: ${res.status}`)

  const blob = await res.blob()
  console.log('📦 Blob size:', Math.round(blob.size / 1024), 'KB')

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      console.log('✅ Base64 ready, length:', reader.result.length)
      resolve(reader.result)
    }
    reader.onerror = () => reject(new Error('Base64 conversion failed'))
    reader.readAsDataURL(blob)
  })
}

/* =========================================
   ROBUST STORAGE PATH EXTRACTION
   Handles: public, sign, authenticated, and raw paths
========================================= */
function extractStoragePath(url) {
  if (!url) return null

  try {
    // If it's already a raw path like "userId/1234.jpg" (no http), return as-is
    if (!url.startsWith('http')) {
      return decodeURIComponent(url.replace(/^\/+/, ''))
    }

    const markers = [
      `/storage/v1/object/public/${RECORDS_BUCKET}/`,
      `/storage/v1/object/sign/${RECORDS_BUCKET}/`,
      `/storage/v1/object/authenticated/${RECORDS_BUCKET}/`,
      `/storage/v1/object/${RECORDS_BUCKET}/`,
      `/object/public/${RECORDS_BUCKET}/`,
      `/object/sign/${RECORDS_BUCKET}/`,
    ]

    for (const marker of markers) {
      const idx = url.indexOf(marker)
      if (idx !== -1) {
        let path = url.slice(idx + marker.length)
        const qIdx = path.indexOf('?')
        if (qIdx !== -1) path = path.slice(0, qIdx)
        const hIdx = path.indexOf('#')
        if (hIdx !== -1) path = path.slice(0, hIdx)
        return decodeURIComponent(path)
      }
    }

    // Last resort: parse URL and grab everything after /object/.../records/
    const u = new URL(url)
    const parts = u.pathname.split('/')
    const recIdx = parts.indexOf(RECORDS_BUCKET)
    if (recIdx !== -1 && recIdx < parts.length - 1) {
      return decodeURIComponent(parts.slice(recIdx + 1).join('/'))
    }

    return null
  } catch (err) {
    console.warn('extractStoragePath failed:', err)
    return null
  }
}

/* =========================================
   FIND REAL PATH IN BUCKET
   If extracted path fails, try to find the file by basename
========================================= */
async function findRealPathInBucket(extractedPath) {
  if (!extractedPath) return null

  const parts = extractedPath.split('/')
  const folder = parts[0]              // e.g. userId
  const fileName = parts[parts.length - 1] // e.g. 1730400000.jpg

  // List files directly in the folder
  const { data: files, error } = await supabase.storage
    .from(RECORDS_BUCKET)
    .list(folder, { limit: 100 })

  if (error) {
    console.warn('List bucket folder failed:', error.message)
    return null
  }

  if (!files || files.length === 0) return null

  console.log('📁 Files in bucket folder:', files.map((f) => f.name))

  // Exact match by basename
  const exact = files.find((f) => f.name === fileName)
  if (exact) return `${folder}/${exact.name}`

  // Fallback: if only 1 file, use it
  if (files.length === 1) return `${folder}/${files[0].name}`

  return null
}

/* =========================================
   EDGE FUNCTION CALLS
========================================= */

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

export async function callExpertInsights(query = 'health expert advice') {
  const { data, error } = await supabase.functions.invoke('health-news', {
    body: { query, type: 'experts' },
  })
  if (error) throw new Error(error.message || 'Experts failed')
  return data
}

export async function callPersonalizedTips(vitals) {
  const { data, error } = await supabase.functions.invoke('health-news', {
    body: { vitals, type: 'personalized' },
  })
  if (error) throw new Error(error.message || 'Tips failed')
  return data
}

export async function callTrendingTopics() {
  const { data, error } = await supabase.functions.invoke('health-news', {
    body: { query: 'trending health topics 2026', type: 'trending' },
  })
  if (error) throw new Error(error.message || 'Trending failed')
  return data
}

export async function callNutritionInsights() {
  const { data, error } = await supabase.functions.invoke('health-news', {
    body: { query: 'nutrition diet healthy eating research', type: 'nutrition' },
  })
  if (error) throw new Error(error.message || 'Nutrition failed')
  return data
}

/** Analyze medical record (AI)
 *  Strategy:
 *   1. Try direct fetch (public bucket) — fast path
 *   2. Extract path → createSignedUrl
 *   3. If "Object not found", list folder & retry with real filename
 *   4. Send base64 to edge function
 */
export async function callAnalyzeRecord(imageUrl) {
  let dataUrl

  // ---- Attempt 1: direct fetch ----
  try {
    dataUrl = await urlToDataURL(imageUrl)
    console.log('✅ Direct fetch succeeded')
  } catch (err) {
    console.warn('⚠️ Direct fetch failed:', err.message)
    console.warn('🔗 Full URL:', imageUrl)

    // ---- Attempt 2: signed URL ----
    let path = extractStoragePath(imageUrl)
    console.warn('📂 Extracted path:', path)

    if (!path) {
      throw new Error(
        'Could not parse storage path from URL. Check console for full URL.'
      )
    }

    let { data: signed, error: signErr } = await supabase.storage
      .from(RECORDS_BUCKET)
      .createSignedUrl(path, 120)

    // ---- Attempt 3: if not found, search bucket for the real file ----
    if (signErr && /not found/i.test(signErr.message)) {
      console.warn('🔍 Object not found — searching bucket for real path…')

      const realPath = await findRealPathInBucket(path)
      console.warn('🎯 Real path found:', realPath)

      if (realPath) {
        path = realPath
        const retry = await supabase.storage
          .from(RECORDS_BUCKET)
          .createSignedUrl(path, 120)
        signed = retry.data
        signErr = retry.error
      }
    }

    if (signErr || !signed?.signedUrl) {
      console.error('Signed URL error:', signErr)
      throw new Error(
        `Failed to access image.\n` +
          `• Bucket: "${RECORDS_BUCKET}"\n` +
          `• Path tried: "${path}"\n` +
          `• Reason: ${signErr?.message || 'unknown'}\n` +
          `Make the bucket public, or add a SELECT policy for authenticated users.`
      )
    }

    console.log('🔐 Signed URL created')
    dataUrl = await urlToDataURL(signed.signedUrl)
  }

  // ---- Send to Edge Function ----
  const { data, error } = await supabase.functions.invoke('analyze-record', {
    body: { dataUrl },
  })

  if (error) {
    console.error('Edge function error:', error)
    throw new Error(error.message || 'Analysis failed')
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data
}

/* =========================================
   CONVERSATION MANAGEMENT
========================================= */

export async function listConversations(userId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createConversation(userId, title = 'New Conversation') {
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      title,
      last_message: '',
      message_count: 0,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateConversation(conversationId, updates) {
  const { data, error } = await supabase
    .from('conversations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteConversation(conversationId) {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)

  if (error) throw error
}

export async function togglePinConversation(conversationId, isPinned) {
  const { data, error } = await supabase
    .from('conversations')
    .update({ is_pinned: isPinned })
    .eq('id', conversationId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getConversationMessages(conversationId) {
  const { data, error } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function saveMessage({
  conversationId,
  userId,
  sender,
  text,
  emergency = false,
  error = false,
}) {
  const { data, error: err } = await supabase
    .from('conversation_messages')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      sender,
      text,
      emergency,
      error,
    })
    .select()
    .single()

  if (err) throw err
  return data
}

export async function clearConversationMessages(conversationId) {
  const { error } = await supabase
    .from('conversation_messages')
    .delete()
    .eq('conversation_id', conversationId)

  if (error) throw error
}

export function generateTitle(text) {
  if (!text) return 'New Conversation'
  const clean = text.trim().slice(0, 50)
  return clean.length < text.length ? clean + '…' : clean
}

/* =========================================
   REVIEWS / FEEDBACK
========================================= */

export async function submitReview(userId, rating, text) {
  const { data: existing } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'approved'])
    .maybeSingle()

  if (existing) {
    if (existing.status === 'pending') {
      throw new Error(
        'You already have a pending review. Please wait for approval.'
      )
    }
    if (existing.status === 'approved') {
      throw new Error("You've already submitted a review. Thank you!")
    }
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({ user_id: userId, rating, text, status: 'pending' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function listApprovedReviews(limit = 6) {
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('status', 'approved')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  if (!reviews || reviews.length === 0) return []

  const userIds = [...new Set(reviews.map((r) => r.user_id))]

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds)

  const profileMap = {}
  profiles?.forEach((p) => {
    profileMap[p.id] = p
  })

  return reviews.map((r) => ({
    ...r,
    profiles: profileMap[r.user_id] || null,
  }))
}

export async function listMyReviews(userId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/* =========================================
   ADMIN FUNCTIONS
========================================= */

export async function checkIsAdmin(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (error) return false
  return data?.role === 'admin'
}

export async function getAdminStats() {
  const [users, chats, reviews, vitals, records, messages] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('chats').select('id', { count: 'exact', head: true }),
    supabase.from('reviews').select('id', { count: 'exact', head: true }),
    supabase.from('vitals').select('id', { count: 'exact', head: true }),
    supabase.from('medical_records').select('id', { count: 'exact', head: true }),
    supabase.from('chat_history').select('id', { count: 'exact', head: true }),
  ])

  return {
    totalUsers: users.count || 0,
    totalChats: chats.count || 0,
    totalReviews: reviews.count || 0,
    totalVitals: vitals.count || 0,
    totalRecords: records.count || 0,
    totalMessages: messages.count || 0,
  }
}

export async function listAllUsers(limit = 100) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function listAllReviews(status = null) {
  let query = supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: reviews, error } = await query
  if (error) throw error
  if (!reviews || reviews.length === 0) return []

  const userIds = [...new Set(reviews.map((r) => r.user_id))]

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', userIds)

  const profileMap = {}
  profiles?.forEach((p) => {
    profileMap[p.id] = p
  })

  return reviews.map((r) => ({
    ...r,
    profiles: profileMap[r.user_id] || null,
  }))
}

export async function approveReview(reviewId) {
  const { data, error } = await supabase
    .from('reviews')
    .update({ status: 'approved' })
    .eq('id', reviewId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function rejectReview(reviewId) {
  const { data, error } = await supabase
    .from('reviews')
    .update({ status: 'rejected' })
    .eq('id', reviewId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function toggleFeaturedReview(reviewId, isFeatured) {
  const { data, error } = await supabase
    .from('reviews')
    .update({ is_featured: isFeatured })
    .eq('id', reviewId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteReview(reviewId) {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)

  if (error) throw error
}

export async function updateUserRole(userId, role) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

/* =========================================
   MEDICAL RECORDS HELPERS
========================================= */

export async function listRecords(userId) {
  const { data, error } = await supabase
    .from('medical_records')
    .select('*')
    .eq('user_id', userId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/** Sanitize filename: strip spaces, keep letters/numbers/dot/dash/underscore */
function sanitizeFileName(name) {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot + 1) : ''
  const safeBase = base
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 60) || 'file'
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toLowerCase()
  return safeExt ? `${safeBase}.${safeExt}` : safeBase
}

export async function uploadRecord(userId, file, metadata = {}) {
  const safeName = sanitizeFileName(file.name)
  const path = `${userId}/${Date.now()}-${safeName}`

  const { error: uploadErr } = await supabase.storage
    .from(RECORDS_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    })

  if (uploadErr) {
    console.error('Upload failed:', uploadErr)
    throw new Error(`Upload failed: ${uploadErr.message}`)
  }

  const { data: urlData } = supabase.storage
    .from(RECORDS_BUCKET)
    .getPublicUrl(path)

  const tags = String(metadata.tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10)

  const { data: record, error: dbErr } = await supabase
    .from('medical_records')
    .insert({
      user_id: userId,
      title: metadata.title || file.name,
      type: metadata.type || 'other',
      notes: metadata.notes || '',
      record_date:
        metadata.recordDate || new Date().toISOString().split('T')[0],
      tags,
      file_url: urlData.publicUrl,
      file_path: path,
      file_size: file.size,
      file_type: file.type,
    })
    .select()
    .single()

  if (dbErr) throw dbErr
  return record
}

export async function deleteRecord(record) {
  if (record.file_path) {
    const { error: rmErr } = await supabase.storage
      .from(RECORDS_BUCKET)
      .remove([record.file_path])
    if (rmErr) console.warn('Storage remove failed:', rmErr.message)
  }
  const { error } = await supabase
    .from('medical_records')
    .delete()
    .eq('id', record.id)

  if (error) throw error
}

export async function toggleRecordPin(recordId, isPinned) {
  const { data, error } = await supabase
    .from('medical_records')
    .update({ is_pinned: isPinned })
    .eq('id', recordId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRecord(recordId, updates) {
  const { data, error } = await supabase
    .from('medical_records')
    .update(updates)
    .eq('id', recordId)
    .select()
    .single()

  if (error) throw error
  return data
}