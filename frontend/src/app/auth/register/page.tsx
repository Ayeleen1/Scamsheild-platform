'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { normalizeEmail, validateEmail, validateName, validatePassword } from '@/lib/validation'
import { API_BASE } from '@/lib/api'

const apiBase = API_BASE

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const nameErr = validateName(name)
    const emailErr = validateEmail(email)
    const passErr = validatePassword(password)

    if (nameErr || emailErr || passErr) {
      setError(nameErr || emailErr || passErr || 'Invalid input')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: normalizeEmail(email), password }),
      })

      const data = await response.json()
      if (!response.ok) {
        const detail = data?.detail
        throw new Error(typeof detail === 'string' ? detail : 'Registration failed.')
      }

      const otp = data.otp_demo || ''
      const emailParam = encodeURIComponent(normalizeEmail(email))
      const otpParam = otp ? `&otp=${otp}` : ''
      router.push(`/auth/verify-email?email=${emailParam}${otpParam}`)
    } catch (err) {
      setError((err as Error).message || 'Unable to register right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-brand-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-xl">
          <h1 className="text-3xl font-semibold text-white">Create account</h1>
          <p className="mt-3 text-slate-300">
            Valid email required (e.g. name@gmail.com). Password: 8+ chars, upper, lower, number.
          </p>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-200">Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-3 w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4 text-slate-100 outline-none focus:border-cyan-300"
                placeholder="Your name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-3 w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4 text-slate-100 outline-none focus:border-cyan-300"
                placeholder="you@gmail.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-3 w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4 text-slate-100 outline-none focus:border-cyan-300"
                placeholder="Test@12345"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-3 w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4 text-slate-100 outline-none focus:border-cyan-300"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
            >
              {loading ? 'Registering...' : 'Create Account'}
            </button>
          </form>

          {error ? <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

          <p className="mt-6 text-sm text-slate-400">
            Already have an account? <a href="/auth/login" className="font-semibold text-cyan-300">Sign in</a>
          </p>
        </div>
      </div>
    </main>
  )
}
