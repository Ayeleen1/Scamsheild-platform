'use client'

import { useState } from 'react'
import Link from 'next/link'
import { normalizeEmail, validateEmail, validatePassword } from '@/lib/validation'
import { API_BASE } from '@/lib/api'

const apiBase = API_BASE

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [displayCode, setDisplayCode] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function requestCode(event: React.FormEvent) {
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
      const res = await fetch(`${apiBase}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizeEmail(email) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Request failed')
      if (data.reset_code) {
        setDisplayCode(data.reset_code)
        setResetCode(data.reset_code)
      }
      setSuccess(data.message)
      setStep(2)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess('')
    const passErr = validatePassword(newPassword)
    if (passErr) {
      setError(passErr)
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizeEmail(email),
          reset_code: resetCode.trim(),
          new_password: newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Reset failed')
      setSuccess(data.message + ' Go to login.')
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
          <h1 className="text-3xl font-semibold text-white">Forgot password</h1>
          <p className="mt-3 text-slate-300">
            Step 1: Get reset code · Step 2: Set new password (demo shows code on screen).
          </p>

          {step === 1 ? (
            <form className="mt-8 space-y-4" onSubmit={requestCode}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Registered email"
                className="w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4"
                required
              />
              <button type="submit" disabled={loading} className="rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950">
                {loading ? 'Sending...' : 'Get reset code'}
              </button>
            </form>
          ) : (
            <form className="mt-8 space-y-4" onSubmit={resetPassword}>
              {displayCode ? (
                <div className="rounded-3xl border border-cyan-300/30 bg-cyan-500/10 p-4">
                  <p className="text-sm text-cyan-200">Demo reset code (production: emailed):</p>
                  <p className="mt-2 text-2xl font-bold tracking-widest text-white">{displayCode}</p>
                </div>
              ) : null}
              <input
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                placeholder="6-digit code"
                className="w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4"
                maxLength={6}
                required
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4"
                required
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4"
                required
              />
              <button type="submit" disabled={loading} className="rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950">
                {loading ? 'Saving...' : 'Reset password'}
              </button>
            </form>
          )}

          {error ? <div className="mt-4 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
          {success ? <div className="mt-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-200">{success}</div> : null}

          <p className="mt-6 text-sm text-slate-400">
            <Link href="/auth/login" className="text-cyan-300">Back to login</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
