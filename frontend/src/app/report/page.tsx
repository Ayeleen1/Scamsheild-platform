'use client'

import { useEffect, useState } from 'react'
import { logout } from '@/lib/auth'
import { API_BASE } from '@/lib/api'

interface ScanDetail {
  label: string
  value: string
}

interface UserInfo {
  name: string
  email: string
}

interface ReportResponse {
  id: string
  source_type: string
  source_value: string
  summary: string
  details: ScanDetail[]
  created_at: string
}

const apiBase = API_BASE

function normalizeValue(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed
}

function parseDetails(raw: string): ScanDetail[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(":")
      return {
        label: label?.trim() || 'detail',
        value: rest.join(':').trim() || 'n/a',
      }
    })
}

export default function ReportPage() {
  const [token, setToken] = useState<string | null>(null)
  const [sourceType, setSourceType] = useState('message')
  const [sourceValue, setSourceValue] = useState('')
  const [summary, setSummary] = useState('')
  const [detailsText, setDetailsText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [reports, setReports] = useState<ReportResponse[]>([])
  const [user, setUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    const savedToken = window.localStorage.getItem('scamshield_token')
    setToken(savedToken)
  }, [])

  useEffect(() => {
    if (token) {
      fetchUser()
      fetchReports()
    } else {
      setUser(null)
      setReports([])
    }
  }, [token])

  async function fetchUser() {
    try {
      const response = await fetch(`${apiBase}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) {
        throw new Error('Session expired. Please log in again.')
      }
      const data = await response.json()
      setUser(data)
    } catch (err) {
      setError((err as Error).message)
      window.localStorage.removeItem('scamshield_token')
      setToken(null)
    }
  }

  async function fetchReports() {
    try {
      const response = await fetch(`${apiBase}/scan/reports`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) {
        throw new Error('Could not load your reports. Sign in to continue.')
      }
      const data = await response.json()
      setReports(data)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const normalizedValue = normalizeValue(sourceValue)
    if (!normalizedValue || !summary.trim()) {
      setError('Please provide a source and a short summary for the report.')
      return
    }

    if (!token) {
      setError('You must be logged in to submit a report.')
      return
    }

    const payload = {
      source_type: sourceType,
      source_value: normalizedValue,
      summary: summary.trim(),
      details: parseDetails(detailsText),
    }

    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/scan/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.detail || 'Unable to submit report.')
      }

      setSuccess('Report submitted successfully.')
      setSourceValue('')
      setSummary('')
      setDetailsText('')
      await fetchReports()
    } catch (err) {
      setError((err as Error).message || 'Unable to submit report right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-brand-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-brand-900/30 backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">Submit Scam Report</h1>
              <p className="mt-3 text-slate-300">Record suspicious messages, URLs, profiles, or images so you can track them securely.</p>
            </div>
            {token ? (
              <div className="space-y-3 rounded-3xl border border-cyan-300/10 bg-brand-900/80 p-5 text-slate-100 shadow-xl shadow-cyan-500/10">
                <p className="text-sm uppercase tracking-[0.28em] text-cyan-300">Signed in as</p>
                <p className="text-lg font-semibold text-white">{user ? user.name : 'Loading user...'}</p>
                <p className="text-sm text-slate-400">{user ? user.email : 'Fetching profile...'}</p>
                <button
                  type="button"
                  onClick={() => logout('/')}
                  className="mt-2 rounded-full border border-red-400/40 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20"
                >
                  Logout
                </button>
              </div>
            ) : (
              <a
                href="/auth/login"
                className="rounded-full border border-white/10 bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Sign in first
              </a>
            )}
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-200">Report type</label>
                <select
                  value={sourceType}
                  onChange={(event) => setSourceType(event.target.value)}
                  className="mt-3 w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                >
                  <option value="message">Message</option>
                  <option value="url">URL</option>
                  <option value="profile">Profile</option>
                  <option value="image">Image</option>
                  <option value="general">General fraud</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">Source value</label>
                <input
                  value={sourceValue}
                  onChange={(event) => setSourceValue(event.target.value)}
                  className="mt-3 w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                  placeholder="Link, message excerpt, or profile URL"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">Summary</label>
              <textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                rows={4}
                className="mt-3 w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                placeholder="Briefly describe why this content is suspicious."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">Details (optional)</label>
              <textarea
                value={detailsText}
                onChange={(event) => setDetailsText(event.target.value)}
                rows={5}
                className="mt-3 w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                placeholder="Use label:value pairs on separate lines, e.g. source:WhatsApp, suspicious_keyword:verify"
              />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={loading || !token}
                className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
              <p className="text-sm text-slate-400">Reports are saved to your account and shown below.</p>
            </div>
          </form>

          {error ? (
            <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">{error}</div>
          ) : null}

          {success ? (
            <div className="mt-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-200">{success}</div>
          ) : null}

          {reports.length > 0 ? (
            <div className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-white">Your recent reports</h2>
              {reports.map((report) => (
                <div key={report.id} className="rounded-3xl border border-white/10 bg-brand-900/80 p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.32em] text-cyan-300">{report.source_type}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{report.summary}</p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase text-slate-300">
                      {new Date(report.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Source</p>
                      <p className="mt-2 text-slate-200">{report.source_value}</p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Details</p>
                      <div className="mt-2 space-y-2 text-slate-200">
                        {report.details.length > 0 ? (
                          report.details.map((detail) => (
                            <div key={detail.label}>
                              <span className="font-semibold text-white">{detail.label}:</span>{' '}
                              {detail.value}
                            </div>
                          ))
                        ) : (
                          <p>No extra details provided.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
