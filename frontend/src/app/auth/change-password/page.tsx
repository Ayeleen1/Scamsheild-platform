'use client'

import { useState } from 'react'
import Link from 'next/link'
import { validatePassword } from '@/lib/validation'
import { API_BASE } from '@/lib/api'

const apiBase = API_BASE

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event: React.FormEvent) {
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

    const token = window.localStorage.getItem('scamshield_token')
    if (!token) {
      setError('Please log in first.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Update failed')
      setSuccess(data.message)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
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
          <h1 className="text-3xl font-semibold text-white">Change password</h1>
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4"
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
              placeholder="Confirm new password"
              className="w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4"
              required
            />
            <button type="submit" disabled={loading} className="rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950">
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
          {error ? <div className="mt-4 text-red-200">{error}</div> : null}
          {success ? <div className="mt-4 text-emerald-200">{success}</div> : null}
          <p className="mt-6">
            <Link href="/account" className="text-cyan-300">Back to account</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
