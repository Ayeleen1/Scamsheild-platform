'use client'

import { useState } from 'react'
import RiskBadge from '@/components/RiskBadge'
import { scanUploadedFile, type ScanResult } from '@/lib/api'
import { getToken } from '@/lib/auth'

export default function FileScannerPage() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setResult(null)

    if (!file) {
      setError('Please select a screenshot/image file.')
      return
    }

    const token = getToken()
    if (!token) {
      setError('Login required to scan uploaded files.')
      return
    }

    setLoading(true)
    try {
      const data = await scanUploadedFile(file, token)
      setResult(data)
    } catch (err) {
      setError((err as Error).message || 'Unable to scan file right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-brand-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-brand-900/30 backdrop-blur-xl">
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">Malware File Scanner</h1>
          <p className="mt-3 text-slate-300">
            Upload suspicious screenshots/files for malware and threat analysis (VirusTotal integrated).
          </p>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-200">Upload file</label>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-brand-900/70 px-4 py-3 text-sm text-slate-200"
              />
              <p className="mt-2 text-xs text-slate-400">Allowed: PNG/JPG/JPEG/WEBP. Login required.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
            >
              {loading ? 'Scanning...' : 'Scan File'}
            </button>
          </form>

          {error ? (
            <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">{error}</div>
          ) : null}

          {result ? (
            <section className="mt-8 rounded-3xl border border-cyan-300/10 bg-brand-900/80 p-6 shadow-xl shadow-cyan-500/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.32em] text-cyan-300">File scan result</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{result.summary}</h2>
                </div>
                <RiskBadge riskLevel={result.risk_level} score={result.score} />
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {result.details.map((detail, index) => (
                  <div key={`${detail.label}-${index}`} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{detail.label}</p>
                    <p className="mt-2 text-slate-200 break-words">{detail.value}</p>
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
