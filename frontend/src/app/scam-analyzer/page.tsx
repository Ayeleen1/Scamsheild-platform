'use client'

import { useRef, useState } from 'react'
import RiskBadge from '@/components/RiskBadge'
import { analyzeMessage, analyzeMessageQuick, type ScanResult } from '@/lib/api'
import { getFastMode } from '@/lib/fastMode'

export default function ScamAnalyzerPage() {
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [deepLoading, setDeepLoading] = useState(false)
  const [scanPhase, setScanPhase] = useState<'idle' | 'quick' | 'ai'>('idle')
  const [error, setError] = useState('')
  const busyRef = useRef(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busyRef.current) return
    setError('')
    setResult(null)
    setScanPhase('idle')

    if (!message.trim()) {
      setError('Please enter a suspicious message to analyze.')
      return
    }

    busyRef.current = true
    setLoading(true)
    const fast = getFastMode()
    try {
      const quick = await analyzeMessageQuick(message)
      setResult(quick)
      setScanPhase('quick')

      if (fast) {
        return
      }

      setDeepLoading(true)
      setScanPhase('ai')
      const deep = await analyzeMessage(message)
      setResult(deep)
      setScanPhase('ai')
    } catch (err) {
      setError((err as Error).message || 'Unable to analyze the message right now.')
    } finally {
      setLoading(false)
      setDeepLoading(false)
      busyRef.current = false
    }
  }

  return (
    <main className="min-h-screen bg-brand-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-brand-900/30 backdrop-blur-xl">
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">Scam Message Analyzer</h1>
          <p className="mt-3 text-slate-300">
            Instant quick scan first, then AI deep analysis updates the result automatically.
          </p>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-200">Suspicious message</label>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={8}
                className="mt-3 w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                placeholder="Write or paste the suspicious message here..."
              />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && !result ? 'Starting…' : deepLoading ? 'AI analyzing…' : 'Analyze Message'}
              </button>
              <p className="text-sm text-slate-400">
                {scanPhase === 'quick' && deepLoading
                  ? 'Quick result ready — deep AI scan running (~10–20 sec)…'
                  : scanPhase === 'ai' && !deepLoading
                    ? 'AI analysis complete.'
                    : 'Step 1: instant · Step 2: AI'}
              </p>
            </div>
          </form>

          {error ? (
            <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">{error}</div>
          ) : null}

          {result ? (
            <section className="mt-8 rounded-3xl border border-cyan-300/10 bg-brand-900/80 p-6 shadow-xl shadow-cyan-500/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.32em] text-cyan-300">
                    Result {deepLoading ? '(updating…)' : scanPhase === 'ai' ? '(AI)' : '(quick)'}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{result.summary}</h2>
                </div>
                <RiskBadge riskLevel={result.risk_level} score={result.score} />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {result.details.map((detail, index) => (
                  <div key={`${detail.label}-${index}`} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{detail.label}</p>
                    <p className="mt-2 text-slate-200">{detail.value}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  )
}
