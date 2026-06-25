'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { normalizeEmail, validateEmail } from '@/lib/validation'
import { API_BASE } from '@/lib/api'

const apiBase = API_BASE

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [demoOtp, setDemoOtp] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const e = params.get('email')
    const o = params.get('otp')
    if (e) setEmail(decodeURIComponent(e))
    if (o) {
      setOtp(o)
      setDemoOtp(o)
    }
  }, [])

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess('')
    const emailErr = validateEmail(email)
    if (emailErr) {
      setError(emailErr)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizeEmail(email), otp: otp.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Verification failed')
      setSuccess(data.message)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setSuccess('')
    const emailErr = validateEmail(email)
    if (emailErr) {
      setError(emailErr)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizeEmail(email) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Resend failed')
      setDemoOtp(data.otp_demo || null)
      setSuccess(data.message)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-brand-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10">
          <h1 className="text-3xl font-semibold text-white">Verify your email</h1>
          <p className="mt-3 text-slate-300">
            OTP required before login. Demo mode shows code on screen (production would email it).
          </p>

          {demoOtp ? (
            <div className="mt-6 rounded-3xl border border-cyan-300/30 bg-cyan-500/10 p-4">
              <p className="text-sm text-cyan-200">Your verification OTP:</p>
              <p className="mt-2 text-3xl font-bold tracking-[0.4em] text-white">{demoOtp}</p>
            </div>
          ) : null}

          <form className="mt-8 space-y-4" onSubmit={handleVerify}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Registered email"
              className="w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4"
              required
            />
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit OTP"
              maxLength={6}
              className="w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4 tracking-widest"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-cyan-400 py-3 font-semibold text-slate-950"
            >
              {loading ? 'Verifying...' : 'Verify email'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleResend}
            disabled={loading}
            className="mt-4 text-sm text-cyan-300 hover:text-cyan-200"
          >
            Resend OTP
          </button>

          {error ? <div className="mt-4 text-red-200">{error}</div> : null}
          {success ? <div className="mt-4 text-emerald-200">{success}</div> : null}

          <p className="mt-6 text-sm text-slate-400">
            Verified? <Link href="/auth/login" className="text-cyan-300">Login</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
