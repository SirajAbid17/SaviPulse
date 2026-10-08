import { useEffect, useState, useRef } from 'react'
import {
  supabase,
  callAnalyzeRecord,
  listRecords,
  uploadRecord,
  deleteRecord,
  toggleRecordPin,
} from '../lib/supabase'
import {
  FileText, Plus, Trash2, Loader2, Eye, Sparkles,
  AlertCircle, X, Download, Pin, Upload, Cloud,
  FileCheck2, Calendar, HardDrive, Hash, Type, Tag,
  CheckCircle2, ListChecks, Pill, FlaskConical, Info,
  AlertTriangle, CalendarClock, FolderOpen,
} from 'lucide-react'

const RECORD_TYPES = [
  { value: 'prescription', label: 'Prescription' },
  { value: 'lab-report', label: 'Lab Report' },
  { value: 'x-ray', label: 'X-Ray' },
  { value: 'scan', label: 'Scan' },
  { value: 'doctor-note', label: "Doctor's Note" },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'discharge', label: 'Discharge Summary' },
  { value: 'other', label: 'Other' },
]

export default function RecordsPage({ user }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [viewRecord, setViewRecord] = useState(null)
  const [viewMode, setViewMode] = useState('view')
  const [filterType, setFilterType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await listRecords(user.id)
      setRecords(data)
    } catch (err) {
      console.error('Load failed:', err)
      setError(err.message || 'Failed to load records')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(file, metadata) {
    setUploading(true)
    try {
      const newRecord = await uploadRecord(user.id, file, metadata)
      await load()
      setShowUploadModal(false)

      // Auto-analyze image
      if (file.type.startsWith('image/')) {
        setTimeout(() => analyzeRecord(newRecord), 400)
      }
    } catch (err) {
      alert(`❌ ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  async function analyzeRecord(record) {
    if (analyzing) return
    setAnalyzing(record.id)

    try {
      // Cache check
      if (record.ai_analysis?.summary) {
        setViewRecord(record)
        setViewMode('analysis')
        setAnalyzing(null)
        return
      }

      // Call Edge Function
      const res = await callAnalyzeRecord(record.file_url)
      if (res?.error) throw new Error(res.error)

      const analysisData = res.analysis

      // Save to DB
      await supabase
        .from('medical_records')
        .update({ ai_analysis: analysisData })
        .eq('id', record.id)

      const updated = { ...record, ai_analysis: analysisData }
      setRecords((prev) => prev.map((r) => (r.id === record.id ? updated : r)))
      setViewRecord(updated)
      setViewMode('analysis')
    } catch (err) {
      console.error('Analyze failed:', err)
      alert(`❌ AI Analysis failed: ${err.message}`)
    } finally {
      setAnalyzing(null)
    }
  }

  function handleView(record) {
    setViewRecord(record)
    setViewMode(record.ai_analysis?.summary ? 'analysis' : 'view')
  }

  async function handlePin(record) {
    try {
      await toggleRecordPin(record.id, !record.is_pinned)
      await load()
    } catch (err) {
      alert(`❌ ${err.message}`)
    }
  }

  async function handleDelete(record) {
    if (!confirm(`Delete "${record.title}"? This cannot be undone.`)) return
    try {
      await deleteRecord(record)
      await load()
    } catch (err) {
      alert(`❌ ${err.message}`)
    }
  }

  /* ============ FILTERED ============ */
  const filtered = records.filter((r) => {
    if (filterType !== 'all' && r.type !== filterType) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        r.title?.toLowerCase().includes(q) ||
        r.notes?.toLowerCase().includes(q) ||
        r.tags?.some((t) => t.toLowerCase().includes(q))
      )
    }
    return true
  })

  /* ============ STATS ============ */
  const stats = {
    total: records.length,
    prescriptions: records.filter((r) => r.type === 'prescription').length,
    labReports: records.filter((r) => r.type === 'lab-report').length,
    aiAnalyzed: records.filter((r) => r.ai_analysis?.summary).length,
  }

  return (
    <div className="records-page">
      {/* HEADER */}
      <section className="records-header-card">
        <div className="records-header-left">
          <div className="records-header-icon">
            <FolderOpen size={22} />
          </div>
          <div>
            <h2>Medical Records</h2>
            <p>Keep your health records organized & secure</p>
          </div>
        </div>
        <button
          className="records-upload-btn"
          onClick={() => setShowUploadModal(true)}
        >
          <Upload size={15} />
          Upload Record
        </button>
      </section>

      {/* STATS */}
      {records.length > 0 && (
        <section className="records-stats-grid">
          <RecordStat
            icon={FolderOpen}
            value={stats.total}
            label="Total Records"
            color="blue"
          />
          <RecordStat
            icon={FileText}
            value={stats.prescriptions}
            label="Prescriptions"
            color="green"
          />
          <RecordStat
            icon={FlaskConical}
            value={stats.labReports}
            label="Lab Reports"
            color="purple"
          />
          <RecordStat
            icon={Sparkles}
            value={stats.aiAnalyzed}
            label="AI Analyzed"
            color="amber"
          />
        </section>
      )}

      {/* SEARCH + FILTERS */}
      <section className="records-toolbar-card">
        <div className="records-search-box">
          <FileText size={15} />
          <input
            type="text"
            placeholder="Search by title, notes or tags…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="records-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="records-filter-chips">
          <button
            className={`records-chip ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All
          </button>
          {RECORD_TYPES.map((t) => (
            <button
              key={t.value}
              className={`records-chip ${filterType === t.value ? 'active' : ''}`}
              onClick={() => setFilterType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* ERROR */}
      {error && (
        <div className="alert alert-error" style={{ marginTop: 14 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* RECORDS GRID */}
      <section className="records-list-card">
        {loading ? (
          <div className="records-loading">
            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} />
            <p>Loading your records…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="records-empty">
            <div className="records-empty-icon">
              <FolderOpen size={32} />
            </div>
            <h3>No records yet</h3>
            <p>
              {searchQuery || filterType !== 'all'
                ? 'Try different filters or clear your search.'
                : 'Upload prescriptions, lab reports, or notes to keep everything in one place.'}
            </p>
            {!searchQuery && filterType === 'all' && (
              <button
                className="records-upload-btn"
                onClick={() => setShowUploadModal(true)}
              >
                <Upload size={14} />
                Upload your first record
              </button>
            )}
          </div>
        ) : (
          <div className="records-grid">
            {filtered.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                analyzing={analyzing === record.id}
                onView={() => handleView(record)}
                onAnalyze={() => analyzeRecord(record)}
                onPin={() => handlePin(record)}
                onDelete={() => handleDelete(record)}
              />
            ))}
          </div>
        )}
      </section>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
          uploading={uploading}
        />
      )}

      {/* VIEW / ANALYSIS MODAL */}
      {viewRecord && (
        <ViewModal
          record={viewRecord}
          mode={viewMode}
          setMode={setViewMode}
          onClose={() => setViewRecord(null)}
          onAnalyze={() => analyzeRecord(viewRecord)}
          analyzing={analyzing === viewRecord.id}
        />
      )}
    </div>
  )
}

/* =========================================
   RECORD STAT
========================================= */
function RecordStat({ icon: Icon, value, label, color }) {
  return (
    <div className={`record-stat-v2 record-stat-${color}`}>
      <div className="record-stat-icon-v2">
        <Icon size={18} />
      </div>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </div>
  )
}

/* =========================================
   RECORD CARD
========================================= */
function RecordCard({ record, analyzing, onView, onAnalyze, onPin, onDelete }) {
  const hasAI = !!record.ai_analysis?.summary
  const isImage = record.file_type?.startsWith('image/')
  const typeLabel =
    RECORD_TYPES.find((t) => t.value === record.type)?.label || record.type

  return (
    <div className="record-card-v2">
      <div className="record-thumb-v2">
        {isImage ? (
          <img src={record.file_url} alt={record.title} loading="lazy" />
        ) : (
          <div className="record-file-icon-v2">
            <FileText size={36} strokeWidth={1.5} />
            <span>PDF</span>
          </div>
        )}

        {record.is_pinned && (
          <span className="record-pin-badge-v2">
            <Pin size={10} fill="white" />
          </span>
        )}

        <span className="record-type-badge-v2">{typeLabel}</span>

        {hasAI && (
          <span className="record-ai-badge-v2">
            <Sparkles size={9} /> AI
          </span>
        )}
      </div>

      <div className="record-body-v2">
        <h3 className="record-title-v2">{record.title}</h3>

        {record.notes && (
          <p className="record-notes-v2">
            {record.notes.slice(0, 80)}
            {record.notes.length > 80 ? '…' : ''}
          </p>
        )}

        <div className="record-meta-v2">
          <span>
            <Calendar size={11} />
            {new Date(record.created_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          {record.file_size > 0 && (
            <span>
              <HardDrive size={11} />
              {(record.file_size / 1024 / 1024).toFixed(2)} MB
            </span>
          )}
        </div>

        {record.tags?.length > 0 && (
          <div className="record-tags-v2">
            {record.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="record-tag-v2">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="record-actions-v2">
        <button onClick={onView} title="View" className="record-action-v2">
          <Eye size={14} />
        </button>

        {isImage && (
          <button
            onClick={hasAI ? onView : onAnalyze}
            disabled={analyzing}
            title={hasAI ? 'View AI' : 'Analyze'}
            className={`record-action-v2 record-action-ai-v2 ${
              analyzing ? 'analyzing' : ''
            }`}
          >
            {analyzing ? (
              <Loader2
                size={14}
                style={{ animation: 'spin 1s linear infinite' }}
              />
            ) : (
              <Sparkles size={14} />
            )}
          </button>
        )}

        <a
          href={record.file_url}
          target="_blank"
          rel="noopener noreferrer"
          title="Download"
          className="record-action-v2"
        >
          <Download size={14} />
        </a>

        <button
          onClick={onPin}
          title="Pin"
          className={`record-action-v2 ${record.is_pinned ? 'pinned' : ''}`}
        >
          <Pin size={14} />
        </button>

        <button
          onClick={onDelete}
          title="Delete"
          className="record-action-v2 record-action-danger-v2"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

/* =========================================
   UPLOAD MODAL
========================================= */
function UploadModal({ onClose, onUpload, uploading }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('other')
  const [notes, setNotes] = useState('')
  const [recordDate, setRecordDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [tags, setTags] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [err, setErr] = useState('')

  const fileInputRef = useRef(null)

  function handleFileSelect(f) {
    if (!f) return
    if (f.size > 15 * 1024 * 1024) {
      setErr('File size must be under 15 MB.')
      return
    }
    setFile(f)
    setErr('')
    if (!title) {
      setTitle(f.name.replace(/\.[^/.]+$/, ''))
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFileSelect(f)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) {
      setErr('Please select a file.')
      return
    }
    if (!title.trim()) {
      setErr('Please enter a title.')
      return
    }

    onUpload(file, { title: title.trim(), type, notes, recordDate, tags })
  }

  return (
    <div className="modal-overlay-v2 open">
      <div className="modal-backdrop-v2" onClick={onClose} />

      <div className="modal-card-v2">
        <button className="modal-close-v2" onClick={onClose} aria-label="Close">
          <X size={14} />
        </button>

        <div className="modal-header-v2">
          <div className="modal-header-icon-v2">
            <Upload size={22} />
          </div>
          <h3>Upload Medical Record</h3>
          <p>
            Prescription, lab report, scan or note — AI will analyze it
            automatically
          </p>
        </div>

        <form onSubmit={handleSubmit} className="upload-form-v2">
          {/* DROPZONE */}
          <div
            className={`dropzone-v2 ${dragOver ? 'drag-over' : ''} ${
              file ? 'has-file' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,application/pdf,.doc,.docx,.txt"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />

            {!file ? (
              <div className="dropzone-empty-v2">
                <div className="dropzone-icon-v2">
                  <Cloud size={22} />
                </div>
                <p>
                  <strong>Click to upload</strong> or drag & drop
                </p>
                <small>PDF, JPG, PNG, DOCX · Max 15 MB</small>
              </div>
            ) : (
              <div className="dropzone-preview-v2">
                <FileCheck2 size={22} />
                <div className="dropzone-preview-info">
                  <strong>{file.name}</strong>
                  <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
                </div>
                <button
                  type="button"
                  className="dropzone-remove-v2"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                    setTitle('')
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          {/* TITLE */}
          <div className="form-row-v2">
            <label>
              <Type size={12} />
              Title <span className="required-v2">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Blood Test - October 2026"
              maxLength={120}
              required
            />
          </div>

          {/* TYPE */}
          <div className="form-row-v2">
            <label>
              <Tag size={12} />
              Type
            </label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {RECORD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* DATE */}
          <div className="form-row-v2">
            <label>
              <Calendar size={12} />
              Record Date
            </label>
            <input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
            />
          </div>

          {/* TAGS */}
          <div className="form-row-v2">
            <label>
              <Hash size={12} />
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. diabetes, annual, blood-test"
              maxLength={200}
            />
          </div>

          {/* NOTES */}
          <div className="form-row-v2">
            <label>
              <FileText size={12} />
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Any details about this record…"
            />
          </div>

          {err && (
            <div className="alert alert-error" style={{ marginBottom: 4 }}>
              <AlertCircle size={14} /> {err}
            </div>
          )}

          <div className="modal-actions-v2">
            <button
              type="button"
              className="btn-outline-v2"
              onClick={onClose}
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-v2"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2
                    size={14}
                    style={{ animation: 'spin 1s linear infinite' }}
                  />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Upload Record
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* =========================================
   VIEW / ANALYSIS MODAL
========================================= */
function ViewModal({ record, mode, setMode, onClose, onAnalyze, analyzing }) {
  const hasAI = !!record.ai_analysis?.summary
  const isImage = record.file_type?.startsWith('image/')

  return (
    <div className="modal-overlay-v2 open">
      <div className="modal-backdrop-v2" onClick={onClose} />

      <div className="modal-card-v2 modal-card-large-v2">
        <button className="modal-close-v2" onClick={onClose} aria-label="Close">
          <X size={14} />
        </button>

        {hasAI && (
          <div className="modal-tabs-v2">
            <button
              className={`modal-tab-v2 ${mode === 'view' ? 'active' : ''}`}
              onClick={() => setMode('view')}
            >
              <Eye size={13} />
              Document
            </button>
            <button
              className={`modal-tab-v2 ${mode === 'analysis' ? 'active' : ''}`}
              onClick={() => setMode('analysis')}
            >
              <Sparkles size={13} />
              AI Analysis
            </button>
          </div>
        )}

        {mode === 'view' && (
          <div className="modal-view-content-v2">
            <div className="view-header-v2">
              <div className="view-type-badge-v2">
                {RECORD_TYPES.find((t) => t.value === record.type)?.label ||
                  record.type}
              </div>
              <h3>{record.title}</h3>
              <div className="view-meta-v2">
                <span>
                  <Calendar size={11} />
                  {new Date(record.created_at).toLocaleDateString()}
                </span>
                {record.file_size > 0 && (
                  <span>
                    <HardDrive size={11} />
                    {(record.file_size / 1024 / 1024).toFixed(2)} MB
                  </span>
                )}
              </div>
            </div>

            <div className="view-preview-v2">
              {isImage ? (
                <img src={record.file_url} alt={record.title} />
              ) : (
                <iframe src={record.file_url} title={record.title} />
              )}
            </div>

            {record.notes && (
              <div className="view-notes-v2">
                <strong>Notes:</strong> {record.notes}
              </div>
            )}

            {record.tags?.length > 0 && (
              <div className="view-tags-v2">
                {record.tags.map((t, i) => (
                  <span key={i}>#{t}</span>
                ))}
              </div>
            )}

            <div className="view-actions-v2">
              {isImage && !hasAI && (
                <button
                  className="btn-ai-analyze-v2"
                  onClick={onAnalyze}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <>
                      <Loader2
                        size={14}
                        style={{ animation: 'spin 1s linear infinite' }}
                      />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Analyze with AI
                    </>
                  )}
                </button>
              )}
              <a
                href={record.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary-v2"
              >
                <Download size={14} />
                Download
              </a>
            </div>
          </div>
        )}

        {mode === 'analysis' && hasAI && (
          <AIAnalysisView analysis={record.ai_analysis} />
        )}
      </div>
    </div>
  )
}

/* =========================================
   AI ANALYSIS VIEW
========================================= */
function AIAnalysisView({ analysis: a }) {
  return (
    <div className="ai-analysis-v2">
      <div className="ai-analysis-header-v2">
        <div className="ai-analysis-badge-v2">
          <Sparkles size={12} /> AI Analysis
        </div>
        <div className="ai-analysis-doc-type-v2">
          {a.documentType || 'Document'}
        </div>
        <h3 className="ai-analysis-summary-v2">{a.summary}</h3>
        {a.summaryUrdu && (
          <p className="ai-analysis-summary-urdu-v2">{a.summaryUrdu}</p>
        )}
      </div>

      <div className="ai-analysis-body-v2">
        {a.keyFindings?.length > 0 && (
          <AISection icon={ListChecks} title="Key Findings">
            <ul>
              {a.keyFindings.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </AISection>
        )}

        {a.medicines?.length > 0 && (
          <AISection icon={Pill} title="Medicines">
            <div className="ai-medicines-v2">
              {a.medicines.map((m, i) => (
                <div key={i} className="ai-medicine-v2">
                  <strong>{m.name}</strong>
                  {m.dosage && <small>{m.dosage}</small>}
                  {m.purpose && <span>{m.purpose}</span>}
                </div>
              ))}
            </div>
          </AISection>
        )}

        {a.testResults?.length > 0 && (
          <AISection icon={FlaskConical} title="Test Results">
            <div className="ai-tests-v2">
              {a.testResults.map((t, i) => (
                <div
                  key={i}
                  className={`ai-test-v2 ai-test-${t.status || 'unknown'}`}
                >
                  <strong>{t.test}</strong>
                  <span className="ai-test-value-v2">{t.value}</span>
                  <small>{t.status}</small>
                </div>
              ))}
            </div>
          </AISection>
        )}

        {a.advice?.length > 0 && (
          <AISection icon={CheckCircle2} title="What You Should Do">
            <ul className="ai-advice-v2">
              {a.advice.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </AISection>
        )}

        {a.warnings?.length > 0 && (
          <AISection icon={AlertTriangle} title="Warnings" warning>
            <ul>
              {a.warnings.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </AISection>
        )}

        {a.followUp && (
          <AISection icon={CalendarClock} title="Follow-up">
            <p>{a.followUp}</p>
          </AISection>
        )}

        <div className="ai-disclaimer-v2">
          <Info size={16} />
          AI analysis is for guidance only. Always consult a qualified doctor.
        </div>
      </div>
    </div>
  )
}

function AISection({ icon: Icon, title, children, warning }) {
  return (
    <div className={`ai-section-v2 ${warning ? 'ai-section-warn-v2' : ''}`}>
      <h4>
        <Icon size={15} />
        {title}
      </h4>
      {children}
    </div>
  )
}