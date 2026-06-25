'use client'

import { useState } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { normalizeEmail, validateEmail } from '@/lib/validation'
import { API_BASE, fetchCaptcha } from '@/lib/api'

const apiBase = API_BASE

export default function LoginPage() {
  const router = useRouter()
  const [registered, setRegistered] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('registered=1')) {
      setRegistered(true)
    }
  }, [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [requiresTotp, setRequiresTotp] = useState(false)
  const [requiresCaptcha, setRequiresCaptcha] = useState(false)
  const [captchaId, setCaptchaId] = useState('')
  const [captchaQuestion, setCaptchaQuestion] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadCaptcha() {
    const data = await fetchCaptcha()
    setCaptchaId(data.captcha_id)
    setCaptchaQuestion(data.question)
    setCaptchaAnswer('')
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const emailErr = validateEmail(email)
    if (emailErr) {
      setError(emailErr)
      return
    }

    if (!password.trim()) {
      setError('Enter your password.')
      return
    }

    setLoading(true)
    try {
      const body = new URLSearchParams()
      body.append('username', normalizeEmail(email))
      body.append('password', password)
      if (totpCode.trim()) {
        body.append('totp_code', totpCode.trim())
      }
      if (requiresCaptcha) {
        body.append('captcha_id', captchaId)
        body.append('captcha_answer', captchaAnswer.trim())
      }

      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const message = errorData?.detail || 'Login failed.'
        if (message.toLowerCase().includes('totp')) {
          setRequiresTotp(true)
        }
        if (message.toLowerCase().includes('captcha')) {
          setRequiresCaptcha(true)
          await loadCaptcha()
        }
        throw new Error(message)
      }

      const data = await response.json()
      window.localStorage.setItem('scamshield_token', data.access_token)
      router.push('/account')
    } catch (err) {
      setError((err as Error).message || 'Unable to login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-brand-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur-xl">
          <h1 className="text-3xl font-semibold text-white">Login</h1>
          {registered ? (
            <p className="mt-3 text-emerald-300">Account created. Please sign in.</p>
          ) : (
            <p className="mt-3 text-slate-300">Sign in to save reports and manage your account.</p>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-200">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-3 w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4 outline-none focus:border-cyan-300"
                placeholder="you@gmail.com"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-200">Password</label>
                <a href="/auth/forgot-password" className="text-sm text-cyan-300 hover:text-cyan-200">
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-3 w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4 outline-none focus:border-cyan-300"
                required
              />
            </div>
            {requiresTotp ? (
              <div>
                <label className="block text-sm font-medium text-slate-200">TOTP code</label>
                <input
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  className="mt-3 w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4 outline-none focus:border-cyan-300"
                  placeholder="123456"
                  maxLength={6}
                />
                <p className="mt-2 text-sm text-slate-400">Enter the code from your authenticator app.</p>
              </div>
            ) : null}
            {requiresCaptcha ? (
              <div>
                <label className="block text-sm font-medium text-slate-200">CAPTCHA</label>
                <div className="mt-3 rounded-2xl border border-white/10 bg-brand-900/70 px-4 py-3 text-sm text-cyan-300">
                  Solve: {captchaQuestion || 'Loading...'}
                </div>
                <input
                  type="text"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  className="mt-3 w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4 outline-none focus:border-cyan-300"
                  placeholder="Enter captcha answer"
                  required
                />
              </div>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {error ? <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

          <p className="mt-6 text-sm text-slate-400">
            New user? <a href="/auth/register" className="font-semibold text-cyan-300">Register</a>
            <br />
            <a href="/auth/verify-email" className="mt-2 inline-block text-cyan-300/80">Verify email OTP</a>
          </p>
        </div>
      </div>
    </main>
  )
}
