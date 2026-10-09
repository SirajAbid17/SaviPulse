import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase env vars missing. Check .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

const RECORDS_BUCKET = 'records'
const AVATAR_BUCKET = 'avatars'
const BLOG_BUCKET = 'blogs'

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
========================================= */
function extractStoragePath(url) {
  if (!url) return null
  try {
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
========================================= */
async function findRealPathInBucket(extractedPath) {
  if (!extractedPath) return null
  const parts = extractedPath.split('/')
  const folder = parts[0]
  const fileName = parts[parts.length - 1]

  const { data: files, error } = await supabase.storage
    .from(RECORDS_BUCKET)
    .list(folder, { limit: 100 })

  if (error) {
    console.warn('List bucket folder failed:', error.message)
    return null
  }
  if (!files || files.length === 0) return null

  console.log('📁 Files in bucket folder:', files.map((f) => f.name))
  const exact = files.find((f) => f.name === fileName)
  if (exact) return `${folder}/${exact.name}`
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

export async function callAnalyzeRecord(imageUrl) {
  let dataUrl

  try {
    dataUrl = await urlToDataURL(imageUrl)
    console.log('✅ Direct fetch succeeded')
  } catch (err) {
    console.warn('⚠️ Direct fetch failed:', err.message)
    console.warn('🔗 Full URL:', imageUrl)

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

  const { data, error } = await supabase.functions.invoke('analyze-record', {
    body: { dataUrl },
  })

  if (error) {
    console.error('Edge function error:', error)
    throw new Error(error.message || 'Analysis failed')
  }
  if (data?.error) throw new Error(data.error)
  return data
}

/* =========================================
   PROFILE HELPERS
   ✅ FIXED: email column REMOVED (it's in auth.users, not profiles)
========================================= */

export async function getProfileById(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.warn('getProfileById failed:', error.message)
    return null
  }
  return data
}

export async function listProfilesByIds(userIds) {
  if (!userIds || userIds.length === 0) return {}
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role')
    .in('id', userIds)
  if (error) {
    console.warn('listProfilesByIds failed:', error.message)
    return {}
  }
  const profileMap = {}
  data?.forEach((p) => {
    profileMap[p.id] = p
  })
  return profileMap
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
    .insert({ user_id: userId, title, last_message: '', message_count: 0 })
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
  const profileMap = await listProfilesByIds(userIds)

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
  const profileMap = await listProfilesByIds(userIds)

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

function sanitizeFileName(name) {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot + 1) : ''
  const safeBase =
    base.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 60) || 'file'
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

/* =========================================
   AVATAR UPLOAD
========================================= */

function avatarExtension(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
}

export async function uploadAvatar(userId, file) {
  if (!file) throw new Error('No file provided.')
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image must be smaller than 5 MB.')
  }

  const ext = avatarExtension(file)
  const path = `${userId}/avatar.${ext}`

  console.log('📤 Uploading avatar to:', path)

  try {
    const { data: existing } = await supabase.storage
      .from(AVATAR_BUCKET)
      .list(userId)
    if (existing?.length) {
      await supabase.storage
        .from(AVATAR_BUCKET)
        .remove(existing.map((f) => `${userId}/${f.name}`))
    }
  } catch (err) {
    console.warn('Old avatar cleanup failed:', err)
  }

  const { error: uploadErr } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    })

  if (uploadErr) {
    console.error('Avatar upload failed:', uploadErr)
    throw new Error(uploadErr.message || 'Upload failed')
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  const publicUrl = `${data.publicUrl}?v=${Date.now()}`

  console.log('✅ Avatar uploaded:', publicUrl)
  return publicUrl
}

export async function deleteAvatar(userId) {
  try {
    const { data: files } = await supabase.storage
      .from(AVATAR_BUCKET)
      .list(userId)
    if (files?.length) {
      await supabase.storage
        .from(AVATAR_BUCKET)
        .remove(files.map((f) => `${userId}/${f.name}`))
    }
  } catch (err) {
    console.warn('Avatar delete failed:', err)
  }
}

/* =========================================
   BLOG FUNCTIONS
========================================= */

export async function listBlogs(limit = 50) {
  const { data: blogs, error } = await supabase
    .from('blogs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  if (!blogs || blogs.length === 0) return []

  // Fetch full author profiles (no email — it's in auth.users)
  const authorIds = [...new Set(blogs.map((b) => b.author_id))]
  const profileMap = await listProfilesByIds(authorIds)

  // Fetch likes count
  const blogIds = blogs.map((b) => b.id)
  const { data: likes } = await supabase
    .from('blog_likes')
    .select('blog_id')
    .in('blog_id', blogIds)

  const likeCounts = {}
  likes?.forEach((l) => {
    likeCounts[l.blog_id] = (likeCounts[l.blog_id] || 0) + 1
  })

  // Fetch comments count
  const { data: comments } = await supabase
    .from('blog_comments')
    .select('blog_id')
    .in('blog_id', blogIds)

  const commentCounts = {}
  comments?.forEach((c) => {
    commentCounts[c.blog_id] = (commentCounts[c.blog_id] || 0) + 1
  })

  return blogs.map((b) => ({
    ...b,
    profiles: profileMap[b.author_id] || null,
    likes_count: likeCounts[b.id] || 0,
    comments_count: commentCounts[b.id] || 0,
    views: b.views || 0,
  }))
}

export async function createBlog(authorId, blogData, file = null) {
  let coverUrl = blogData.cover_url || null

  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Cover image must be under 5 MB.')
    }
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${authorId}/${Date.now()}-cover.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from(BLOG_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadErr) throw new Error(`Cover upload failed: ${uploadErr.message}`)

    const { data: urlData } = supabase.storage
      .from(BLOG_BUCKET)
      .getPublicUrl(path)
    coverUrl = urlData.publicUrl
  }

  const { data, error } = await supabase
    .from('blogs')
    .insert({
      author_id: authorId,
      title: blogData.title,
      category: blogData.category || 'General',
      content: blogData.content,
      cover_url: coverUrl,
      read_time: blogData.read_time || '3 min read',
      views: 0,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateBlog(blogId, updates) {
  const { data, error } = await supabase
    .from('blogs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', blogId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBlog(blog) {
  if (blog.cover_url) {
    try {
      const markers = [
        `/storage/v1/object/public/${BLOG_BUCKET}/`,
        `/storage/v1/object/sign/${BLOG_BUCKET}/`,
        `/object/public/${BLOG_BUCKET}/`,
      ]
      for (const marker of markers) {
        const idx = blog.cover_url.indexOf(marker)
        if (idx !== -1) {
          let path = blog.cover_url.slice(idx + marker.length)
          const qIdx = path.indexOf('?')
          if (qIdx !== -1) path = path.slice(0, qIdx)
          await supabase.storage.from(BLOG_BUCKET).remove([path])
          break
        }
      }
    } catch (err) {
      console.warn('Cover cleanup failed:', err)
    }
  }

  const { error } = await supabase.from('blogs').delete().eq('id', blog.id)
  if (error) throw error
}

/* ---------- VIEWS ---------- */
export async function incrementBlogViews(blogId) {
  try {
    const { data: blog } = await supabase
      .from('blogs')
      .select('views')
      .eq('id', blogId)
      .single()

    const currentViews = blog?.views || 0

    const { error } = await supabase
      .from('blogs')
      .update({ views: currentViews + 1 })
      .eq('id', blogId)

    if (error) throw error
    return currentViews + 1
  } catch (err) {
    console.warn('View increment failed:', err)
    return null
  }
}

/* ---------- BLOG LIKES ---------- */
export async function toggleBlogLike(blogId, userId, currentlyLiked) {
  if (currentlyLiked) {
    const { error } = await supabase
      .from('blog_likes')
      .delete()
      .eq('blog_id', blogId)
      .eq('user_id', userId)
    if (error) throw error
    return false
  } else {
    const { error } = await supabase
      .from('blog_likes')
      .insert({ blog_id: blogId, user_id: userId })
    if (error) throw error
    return true
  }
}

export async function listBlogLikes(blogId) {
  const { data, error } = await supabase
    .from('blog_likes')
    .select('user_id')
    .eq('blog_id', blogId)
  if (error) throw error
  return data || []
}

/* ---------- BLOG COMMENTS ---------- */
export async function listBlogComments(blogId) {
  const { data: comments, error } = await supabase
    .from('blog_comments')
    .select('*')
    .eq('blog_id', blogId)
    .order('created_at', { ascending: true })
  if (error) throw error
  if (!comments || comments.length === 0) return []

  const userIds = [...new Set(comments.map((c) => c.user_id))]
  const profileMap = await listProfilesByIds(userIds)

  return comments.map((c) => ({
    ...c,
    profiles: profileMap[c.user_id] || null,
  }))
}

export async function createBlogComment(blogId, userId, text) {
  const { data, error } = await supabase
    .from('blog_comments')
    .insert({ blog_id: blogId, user_id: userId, text })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBlogComment(commentId) {
  const { error } = await supabase
    .from('blog_comments')
    .delete()
    .eq('id', commentId)
  if (error) throw error
}