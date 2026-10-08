import { useState, useEffect, useRef, useCallback } from 'react'
import {
  supabase,
  callChatAI,
  listConversations,
  createConversation,
  updateConversation,
  deleteConversation,
  togglePinConversation,
  getConversationMessages,
  saveMessage,
  clearConversationMessages,
  generateTitle,
} from '../lib/supabase'
import { marked } from 'marked'
import {
  Sparkles, Send, MessageSquare, Loader2, Copy, Check,
  ThumbsUp, ThumbsDown, RotateCcw, AlertTriangle, Trash2,
  User, Bot, Sparkle, Zap, Clock, ChevronDown, Plus,
  MessageCirclePlus, Search, Pin, PinOff, Edit3, X,
  MoreVertical, Menu, MessageSquarePlus, PanelLeftClose,
  PanelLeftOpen, ChevronRight,
} from 'lucide-react'

/* =========================================
   MARKDOWN RENDERER
========================================= */
function renderMarkdown(text) {
  if (!text) return ''
  try {
    marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false })
    const html = marked.parse(text)
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
      .replace(/javascript:/gi, '')
  } catch {
    return text.replace(/\n/g, '<br>')
  }
}

export default function ChatPage({ user }) {
  /* ============ CONVERSATION STATE ============ */
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [convsLoading, setConvsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true) // desktop
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [menuOpenId, setMenuOpenId] = useState(null)

  /* ============ CHAT STATE ============ */
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [reactions, setReactions] = useState({})

  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)
  const menuRef = useRef(null)

  /* =========================================
     INITIAL LOAD
  ========================================= */
  useEffect(() => {
    initConversations()
  }, [user.id])

  async function initConversations() {
    setConvsLoading(true)
    try {
      const list = await listConversations(user.id)
      setConversations(list)

      if (list.length > 0) {
        await switchConversation(list[0].id)
      }
      // Else: show empty state (no auto-create — will create on first message)
    } catch (err) {
      console.error('Load conversations failed:', err)
      setError('Failed to load conversations')
    } finally {
      setConvsLoading(false)
    }
  }

  /* =========================================
     SWITCH CONVERSATION
  ========================================= */
  async function switchConversation(convId) {
    if (convId === activeConvId) return

    setActiveConvId(convId)
    setMessagesLoading(true)
    setReactions({})

    try {
      const msgs = await getConversationMessages(convId)
      setMessages(
        msgs.map((m) => ({
          id: m.id,
          sender: m.sender,
          text: m.text,
          emergency: m.emergency,
          error: m.error,
          createdAt: m.created_at,
        }))
      )
    } catch (err) {
      console.error('Load messages failed:', err)
      setError('Failed to load messages')
    } finally {
      setMessagesLoading(false)
      scrollToBottom(false)
    }
  }

  /* =========================================
     CREATE NEW CONVERSATION
  ========================================= */
  function handleNewConversation() {
    setActiveConvId(null)
    setMessages([])
    setMessage('')
    setError('')
    setReactions({})
    setTimeout(() => inputRef.current?.focus(), 100)
    setMobileSidebarOpen(false)
  }

  /* =========================================
     AUTO SCROLL
  ========================================= */
  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
      })
    }, 50)
  }, [])

  const handleScroll = () => {
    const el = messagesContainerRef.current
    if (!el) return
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    setShowScrollBtn(!isAtBottom)
  }

  /* =========================================
     SEND MESSAGE
  ========================================= */
  async function handleSend(e, overrideText = null) {
    e?.preventDefault()
    const text = (overrideText || message).trim()
    if (!text || loading) return

    setError('')
    setMessage('')

    let convId = activeConvId
    let isNewConv = false

    try {
      // Create conversation if none exists
      if (!convId) {
        const newConv = await createConversation(user.id, generateTitle(text))
        convId = newConv.id
        setActiveConvId(convId)
        setConversations((prev) => [newConv, ...prev])
        isNewConv = true
      }

      // Add user message optimistically
      const userMsg = {
        sender: 'user',
        text,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])

      // Save user message to DB
      await saveMessage({
        conversationId: convId,
        userId: user.id,
        sender: 'user',
        text,
      })

      setLoading(true)

      // Call AI
      const history = messages.slice(-10).map((m) => ({
        sender: m.sender,
        text: m.text,
      }))

      const res = await callChatAI(text, history)
      if (res?.error) throw new Error(res.error)

      const aiMsg = {
        sender: 'ai',
        text: res?.text || 'No response',
        emergency: res?.emergency || false,
        createdAt: new Date().toISOString(),
      }

      // Add AI message optimistically
      setMessages((prev) => [...prev, aiMsg])

      // Save AI message
      await saveMessage({
        conversationId: convId,
        userId: user.id,
        sender: 'ai',
        text: aiMsg.text,
        emergency: aiMsg.emergency,
      })

      // Update conversation meta
      const newLastMessage = aiMsg.text.slice(0, 120)
      await updateConversation(convId, {
        last_message: newLastMessage,
        message_count: (messages.length + 2),
      })

      // Refresh conversation list (with updated title/last message)
      if (!isNewConv) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  last_message: newLastMessage,
                  updated_at: new Date().toISOString(),
                }
              : c
          )
        )
      }
    } catch (err) {
      const errMsg = {
        sender: 'ai',
        text: `⚠️ ${err.message}`,
        error: true,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errMsg])

      // Try to save error message if we have a conv
      if (convId) {
        try {
          await saveMessage({
            conversationId: convId,
            userId: user.id,
            sender: 'ai',
            text: errMsg.text,
            error: true,
          })
        } catch {}
      }
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  /* =========================================
     RETRY
  ========================================= */
  function handleRetry() {
    const lastUser = [...messages].reverse().find((m) => m.sender === 'user')
    if (!lastUser) return

    setMessages((prev) => {
      const copy = [...prev]
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].sender === 'ai' || copy[i].error) {
          copy.splice(i, 1)
          break
        }
      }
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].sender === 'user') {
          copy.splice(i, 1)
          break
        }
      }
      return copy
    })

    handleSend(null, lastUser.text)
  }

  /* =========================================
     RENAME CONVERSATION
  ========================================= */
  async function handleRenameStart(conv) {
    setRenamingId(conv.id)
    setRenameValue(conv.title)
    setMenuOpenId(null)
  }

  async function handleRenameSave() {
    const id = renamingId
    const title = renameValue.trim()
    if (!id || !title) {
      setRenamingId(null)
      return
    }

    try {
      await updateConversation(id, { title })
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c))
      )
    } catch (err) {
      setError('Rename failed')
    } finally {
      setRenamingId(null)
      setRenameValue('')
    }
  }

  function handleRenameKey(e) {
    if (e.key === 'Enter') handleRenameSave()
    if (e.key === 'Escape') {
      setRenamingId(null)
      setRenameValue('')
    }
  }

  /* =========================================
     DELETE CONVERSATION
  ========================================= */
  async function handleDeleteConv(conv) {
    setMenuOpenId(null)
    const ok = window.confirm(
      `Delete "${conv.title}"? All messages will be permanently removed.`
    )
    if (!ok) return

    try {
      await deleteConversation(conv.id)
      setConversations((prev) => prev.filter((c) => c.id !== conv.id))

      if (activeConvId === conv.id) {
        // Switch to another conversation or empty
        const remaining = conversations.filter((c) => c.id !== conv.id)
        if (remaining.length > 0) {
          await switchConversation(remaining[0].id)
        } else {
          setActiveConvId(null)
          setMessages([])
        }
      }
    } catch (err) {
      setError('Delete failed')
    }
  }

  /* =========================================
     PIN CONVERSATION
  ========================================= */
  async function handleTogglePin(conv) {
    setMenuOpenId(null)
    try {
      const newPin = !conv.is_pinned
      await togglePinConversation(conv.id, newPin)

      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === conv.id ? { ...c, is_pinned: newPin } : c
        )
        return updated.sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1
          return new Date(b.updated_at) - new Date(a.updated_at)
        })
      })
    } catch (err) {
      setError('Pin failed')
    }
  }

  /* =========================================
     CLEAR CONVERSATION MESSAGES
  ========================================= */
  async function handleClearMessages() {
    if (!activeConvId) return
    const ok = window.confirm('Clear all messages in this conversation?')
    if (!ok) return

    try {
      await clearConversationMessages(activeConvId)
      setMessages([])
      await updateConversation(activeConvId, {
        last_message: '',
        message_count: 0,
      })
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? { ...c, last_message: '', message_count: 0 }
            : c
        )
      )
    } catch (err) {
      setError('Clear failed')
    }
  }

  /* =========================================
     COPY & REACTIONS
  ========================================= */
  async function handleCopy(text, idx) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(idx)
      setTimeout(() => setCopiedId(null), 1800)
    } catch {}
  }

  function handleReaction(idx, type) {
    setReactions((prev) => ({
      ...prev,
      [idx]: prev[idx] === type ? null : type,
    }))
  }

  /* =========================================
     CLICK OUTSIDE MENU
  ========================================= */
  useEffect(() => {
    function handleClick(e) {
      if (menuOpenId && menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpenId])

  /* =========================================
     KEYBOARD SHORTCUTS
  ========================================= */
  useEffect(() => {
    function handleKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        handleNewConversation()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  /* =========================================
     FILTER CONVERSATIONS BY SEARCH
  ========================================= */
  const filteredConvs = conversations.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      c.title.toLowerCase().includes(q) ||
      (c.last_message || '').toLowerCase().includes(q)
    )
  })

  const pinned = filteredConvs.filter((c) => c.is_pinned)
  const unpinned = filteredConvs.filter((c) => !c.is_pinned)

  const quickQuestions = [
    { text: 'I have a headache', icon: '🤕' },
    { text: 'Why am I feeling tired?', icon: '😴' },
    { text: 'How can I sleep better?', icon: '🌙' },
    { text: 'Is my heart rate normal?', icon: '❤️' },
    { text: 'What should I eat for energy?', icon: '🥗' },
    { text: 'How to reduce stress?', icon: '🧘' },
  ]

  const isEmpty = !activeConvId && messages.length === 0

  return (
    <div className="chat-shell">
      {/* =========================================
          MOBILE OVERLAY
      ========================================= */}
      {mobileSidebarOpen && (
        <div
          className="chat-mobile-overlay"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* =========================================
          SIDEBAR — CONVERSATIONS LIST
      ========================================= */}
      <aside
        className={`chat-sidebar ${sidebarOpen ? 'open' : 'closed'} ${
          mobileSidebarOpen ? 'mobile-open' : ''
        }`}
      >
        {/* Header */}
        <div className="chat-sidebar-header">
          <button
            className="chat-new-btn"
            onClick={handleNewConversation}
            title="New conversation (Ctrl+N)"
          >
            <MessageSquarePlus size={16} />
            <span>New Chat</span>
          </button>

          <button
            className="chat-sidebar-collapse"
            onClick={() => setSidebarOpen(false)}
            title="Collapse sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="chat-sidebar-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search conversations…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="chat-search-clear"
              onClick={() => setSearchQuery('')}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* List */}
        <div className="chat-sidebar-list">
          {convsLoading ? (
            <div className="chat-sidebar-loading">
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Loading…</span>
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="chat-sidebar-empty">
              {searchQuery ? (
                <>
                  <Search size={24} style={{ opacity: 0.4 }} />
                  <p>No matches</p>
                </>
              ) : (
                <>
                  <MessageSquare size={24} style={{ opacity: 0.4 }} />
                  <p>No conversations yet</p>
                  <button onClick={handleNewConversation}>
                    <Plus size={13} /> Start new
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {pinned.length > 0 && (
                <>
                  <p className="chat-sidebar-section">Pinned</p>
                  {pinned.map((c) => (
                    <ConversationItem
                      key={c.id}
                      conv={c}
                      active={activeConvId === c.id}
                      renamingId={renamingId}
                      renameValue={renameValue}
                      setRenameValue={setRenameValue}
                      onRenameStart={handleRenameStart}
                      onRenameSave={handleRenameSave}
                      onRenameKey={handleRenameKey}
                      onSwitch={() => {
                        switchConversation(c.id)
                        setMobileSidebarOpen(false)
                      }}
                      onTogglePin={() => handleTogglePin(c)}
                      onDelete={() => handleDeleteConv(c)}
                      menuOpenId={menuOpenId}
                      setMenuOpenId={setMenuOpenId}
                      menuRef={menuRef}
                    />
                  ))}
                  <div className="chat-sidebar-divider" />
                </>
              )}

              {unpinned.length > 0 && (
                <>
                  {pinned.length > 0 && (
                    <p className="chat-sidebar-section">All Chats</p>
                  )}
                  {unpinned.map((c) => (
                    <ConversationItem
                      key={c.id}
                      conv={c}
                      active={activeConvId === c.id}
                      renamingId={renamingId}
                      renameValue={renameValue}
                      setRenameValue={setRenameValue}
                      onRenameStart={handleRenameStart}
                      onRenameSave={handleRenameSave}
                      onRenameKey={handleRenameKey}
                      onSwitch={() => {
                        switchConversation(c.id)
                        setMobileSidebarOpen(false)
                      }}
                      onTogglePin={() => handleTogglePin(c)}
                      onDelete={() => handleDeleteConv(c)}
                      menuOpenId={menuOpenId}
                      setMenuOpenId={setMenuOpenId}
                      menuRef={menuRef}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </aside>

      {/* =========================================
          MAIN CHAT AREA
      ========================================= */}
      <section className="chat-main">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            {!sidebarOpen && (
              <button
                className="chat-sidebar-open"
                onClick={() => setSidebarOpen(true)}
                title="Open conversations"
              >
                <PanelLeftOpen size={16} />
              </button>
            )}

            <button
              className="chat-mobile-menu"
              onClick={() => setMobileSidebarOpen(true)}
              title="Menu"
            >
              <Menu size={16} />
            </button>

            <div className="chat-avatar">
              <Sparkles size={18} />
              <span className="chat-avatar-pulse" />
            </div>
            <div className="chat-header-info">
              <h3>
                {activeConvId
                  ? conversations.find((c) => c.id === activeConvId)?.title ||
                    'Chat'
                  : 'AI Doctor'}
              </h3>
              <p>
                <span className="chat-status-dot" />
                Online • Powered by Gemini & Groq
              </p>
            </div>
          </div>

          <div className="chat-header-right">
            {activeConvId && (
              <button
                className="chat-header-btn"
                onClick={handleClearMessages}
                title="Clear this conversation"
              >
                <Trash2 size={14} />
                <span className="chat-header-btn-label">Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div
          className="chat-messages"
          ref={messagesContainerRef}
          onScroll={handleScroll}
        >
          {messagesLoading ? (
            <div className="chat-msg-loading">
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              <p>Loading messages…</p>
            </div>
          ) : isEmpty ? (
            <EmptyState
              user={user}
              quickQuestions={quickQuestions}
              onQuestionClick={(q) => handleSend(null, q)}
            />
          ) : (
            <>
              {messages.map((m, i) => (
                <Message
                  key={m.id || i}
                  message={m}
                  index={i}
                  copied={copiedId === i}
                  reaction={reactions[i]}
                  onCopy={() => handleCopy(m.text, i)}
                  onReact={(type) => handleReaction(i, type)}
                  onRetry={m.error ? handleRetry : null}
                />
              ))}

              {loading && <TypingIndicator />}
              {error && (
                <div className="chat-error">
                  <AlertTriangle size={14} />
                  {error}
                </div>
              )}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll button */}
        {showScrollBtn && (
          <button
            className="chat-scroll-btn"
            onClick={() => scrollToBottom()}
            title="Scroll to latest"
          >
            <ChevronDown size={16} />
          </button>
        )}

        {/* Input */}
        <form onSubmit={handleSend} className="chat-input-form">
          <div className="chat-input-wrap">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 140) + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(e)
                }
              }}
              placeholder="Ask about symptoms, medicines, diet, or anything health-related…"
              rows={1}
              disabled={loading}
              maxLength={2000}
            />

            <div className="chat-input-footer">
              <div className="chat-input-hints">
                <kbd>⏎</kbd> send
                <span className="chat-hint-sep">·</span>
                <kbd>⇧⏎</kbd> new line
                <span className="chat-hint-sep">·</span>
                <kbd>⌘N</kbd> new chat
              </div>
              <span className="chat-char-count">{message.length}/2000</span>
            </div>
          </div>

          <button
            type="submit"
            className="chat-send-btn"
            disabled={loading || !message.trim()}
            title="Send message"
          >
            {loading ? (
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <>
                <Send size={16} />
                <span className="chat-send-label">Send</span>
              </>
            )}
          </button>
        </form>

        <p className="chat-disclaimer-text">
          <AlertTriangle size={11} />
          SaviPulse provides general health info, not a medical diagnosis. Always
          consult a qualified doctor for urgent concerns.
        </p>
      </section>
    </div>
  )
}

/* =========================================
   CONVERSATION ITEM
========================================= */
function ConversationItem({
  conv,
  active,
  renamingId,
  renameValue,
  setRenameValue,
  onRenameStart,
  onRenameSave,
  onRenameKey,
  onSwitch,
  onTogglePin,
  onDelete,
  menuOpenId,
  setMenuOpenId,
  menuRef,
}) {
  const isRenaming = renamingId === conv.id
  const isMenuOpen = menuOpenId === conv.id

  return (
    <div
      className={`chat-conv-item ${active ? 'active' : ''}`}
      onClick={() => !isRenaming && onSwitch()}
    >
      <div className="chat-conv-icon">
        {conv.is_pinned ? <Pin size={12} /> : <MessageSquare size={12} />}
      </div>

      <div className="chat-conv-content">
        {isRenaming ? (
          <input
            className="chat-conv-rename-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={onRenameKey}
            onBlur={onRenameSave}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <strong className="chat-conv-title">{conv.title}</strong>
            <small className="chat-conv-preview">
              {conv.last_message || 'No messages yet'}
            </small>
          </>
        )}
      </div>

      {!isRenaming && (
        <button
          className="chat-conv-menu-btn"
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpenId(isMenuOpen ? null : conv.id)
          }}
          title="Options"
        >
          <MoreVertical size={14} />
        </button>
      )}

      {isMenuOpen && (
        <div
          className="chat-conv-menu"
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onRenameStart}>
            <Edit3 size={12} /> Rename
          </button>
          <button onClick={onTogglePin}>
            {conv.is_pinned ? (
              <>
                <PinOff size={12} /> Unpin
              </>
            ) : (
              <>
                <Pin size={12} /> Pin
              </>
            )}
          </button>
          <div className="chat-conv-menu-divider" />
          <button className="danger" onClick={onDelete}>
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

/* =========================================
   EMPTY STATE
========================================= */
function EmptyState({ user, quickQuestions, onQuestionClick }) {
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="chat-empty">
      <div className="chat-empty-icon">
        <Sparkles size={32} />
        <span className="chat-empty-ring" />
      </div>

      <h4>How can I help you today, {firstName}?</h4>
      <p>
        Ask me about symptoms, medicines, diet, sleep, stress, or anything
        health-related. I'm here 24/7.
      </p>

      <div className="chat-quick-grid">
        {quickQuestions.map((q, i) => (
          <button
            key={i}
            className="chat-quick-card"
            onClick={() => onQuestionClick(q.text)}
          >
            <span className="chat-quick-emoji">{q.icon}</span>
            <span className="chat-quick-text">{q.text}</span>
            <Sparkle size={12} className="chat-quick-sparkle" />
          </button>
        ))}
      </div>

      <div className="chat-empty-trust">
        <div className="chat-trust-item">
          <Zap size={12} /> Fast responses
        </div>
        <div className="chat-trust-item">
          <Sparkles size={12} /> AI-powered
        </div>
        <div className="chat-trust-item">
          <Clock size={12} /> Available 24/7
        </div>
      </div>
    </div>
  )
}

/* =========================================
   MESSAGE
========================================= */
function Message({ message, index, copied, reaction, onCopy, onReact, onRetry }) {
  const isUser = message.sender === 'user'
  const isEmergency = message.emergency
  const isError = message.error
  const renderedHtml = isUser ? null : renderMarkdown(message.text)

  return (
    <div
      className={`chat-msg ${isUser ? 'chat-msg-user' : 'chat-msg-ai'} ${
        isEmergency ? 'chat-msg-emergency' : ''
      } ${isError ? 'chat-msg-error' : ''}`}
    >
      {!isUser && (
        <div className="chat-msg-avatar">
          {isEmergency ? <AlertTriangle size={16} /> : <Bot size={16} />}
        </div>
      )}

      <div className="chat-msg-content">
        <div className="chat-msg-bubble">
          {isUser ? (
            <p className="chat-msg-text">{message.text}</p>
          ) : (
            <div
              className="chat-msg-markdown"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          )}
        </div>

        {!isUser && (
          <div className="chat-msg-actions">
            <button className="chat-msg-action" onClick={onCopy} title="Copy">
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              className={`chat-msg-action ${reaction === 'up' ? 'active' : ''}`}
              onClick={() => onReact('up')}
              title="Helpful"
            >
              <ThumbsUp size={12} />
            </button>
            <button
              className={`chat-msg-action ${
                reaction === 'down' ? 'active' : ''
              }`}
              onClick={() => onReact('down')}
              title="Not helpful"
            >
              <ThumbsDown size={12} />
            </button>
            {onRetry && (
              <button className="chat-msg-action" onClick={onRetry} title="Retry">
                <RotateCcw size={12} /> Retry
              </button>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="chat-msg-avatar chat-msg-avatar-user">
          <User size={16} />
        </div>
      )}
    </div>
  )
}

/* =========================================
   TYPING INDICATOR
========================================= */
function TypingIndicator() {
  return (
    <div className="chat-msg chat-msg-ai">
      <div className="chat-msg-avatar">
        <Bot size={16} />
      </div>
      <div className="chat-msg-content">
        <div className="chat-typing">
          <span className="chat-typing-dot" />
          <span className="chat-typing-dot" />
          <span className="chat-typing-dot" />
          <span className="chat-typing-text">SaviPulse is thinking…</span>
        </div>
      </div>
    </div>
  )
}