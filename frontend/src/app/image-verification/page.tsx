'use client'

import { useState } from 'react'
import RiskBadge from '@/components/RiskBadge'
import { verifyImage, type ScanResult } from '@/lib/api'

function normalizeUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export default function ImageVerificationPage() {
  const [imageUrl, setImageUrl] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setResult(null)

    const normalized = normalizeUrl(imageUrl)
    if (!normalized) {
      setError('Please enter a valid image URL to verify.')
      return
    }

    setLoading(true)
    try {
      const data = await verifyImage(normalized)
      setResult(data)
    } catch (err) {
      setError((err as Error).message || 'Unable to verify the image right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-brand-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-brand-900/30 backdrop-blur-xl">
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">Image Verification</h1>
          <p className="mt-3 text-slate-300">Submit an image URL to detect scam-related hosting patterns.</p>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-200">Image URL</label>
              <input
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                className="mt-3 w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                placeholder="https://example.com/photo.jpg"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Verifying...' : 'Verify Image'}
            </button>
          </form>

          {error ? (
            <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">{error}</div>
          ) : null}

          {result ? (
            <section className="mt-8 rounded-3xl border border-cyan-300/10 bg-brand-900/80 p-6 shadow-xl shadow-cyan-500/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.32em] text-cyan-300">Verification Result</p>
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
