'use client'

import { useEffect, useState } from 'react'
import {
  fetchBlacklist,
  fetchCommunityReports,
  postAnonymousReport,
} from '@/lib/api'

export default function CommunityPage() {
  const [reports, setReports] = useState<
    Array<{ id: string; source_type: string; source_value: string; summary: string; created_at: string }>
  >([])
  const [blacklist, setBlacklist] = useState<
    Array<{ value: string; kind: string; reason: string; created_at: string }>
  >([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ source_type: 'url', source_value: '', summary: '', platform: 'whatsapp' })
  const [msg, setMsg] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [r, b] = await Promise.all([fetchCommunityReports(25), fetchBlacklist(20)])
      setReports(r.reports)
      setBlacklist(b.items)
    } catch {
      setMsg('Could not load feed. Is backend running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function submitReport(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    try {
      await postAnonymousReport(form)
      setForm({ ...form, source_value: '', summary: '' })
      setMsg('Report added — thank you!')
      await load()
    } catch (err) {
      setMsg((err as Error).message)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-white">Community Feed</h1>
      <p className="mt-1 text-sm text-slate-400">Recent scams reported by users (values only, no personal data).</p>

      <form onSubmit={submitReport} className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-medium text-cyan-300">Quick report (no login)</p>
        <select
          value={form.source_type}
          onChange={(e) => setForm({ ...form, source_type: e.target.value })}
          className="w-full rounded-xl border border-white/10 bg-brand-900/70 px-3 py-2 text-sm"
        >
          <option value="url">URL</option>
          <option value="message">Message</option>
          <option value="profile">Profile</option>
        </select>
        <input
          placeholder="Link or text snippet"
          value={form.source_value}
          onChange={(e) => setForm({ ...form, source_value: e.target.value })}
          className="w-full rounded-xl border border-white/10 bg-brand-900/70 px-3 py-2 text-sm"
        />
        <input
          placeholder="Short summary"
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
          className="w-full rounded-xl border border-white/10 bg-brand-900/70 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">
          Submit
        </button>
        {msg ? <p className="text-sm text-slate-300">{msg}</p> : null}
      </form>

      {loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-lg text-white">Recent reports</h2>
            <ul className="mt-3 space-y-2">
              {reports.length === 0 ? (
                <li className="text-sm text-slate-500">No public reports yet.</li>
              ) : (
                reports.map((r) => (
                  <li key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                    <span className="text-cyan-300">{r.source_type}</span>
                    <p className="mt-1 truncate text-slate-300">{r.source_value}</p>
                    <p className="text-slate-400">{r.summary}</p>
                  </li>
                ))
              )}
            </ul>
          </section>
          <section className="mt-8">
            <h2 className="text-lg text-white">Blacklist</h2>
            <ul className="mt-3 space-y-2">
              {blacklist.map((b, i) => (
                <li key={i} className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm">
                  <span className="text-red-300">{b.kind}</span> — {b.value}
                  {b.reason ? <p className="text-slate-500">{b.reason}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  )
}
