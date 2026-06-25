'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { logout } from '@/lib/auth'
import { API_BASE, fetchTOTPStatus, setupTOTP, verifyTOTP, disableTOTP } from '@/lib/api'

interface UserInfo {
  name: string
  email: string
}

const apiBase = API_BASE

export default function AccountPage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [totpEnabled, setTotpEnabled] = useState<boolean | null>(null)
  const [setupSecret, setSetupSecret] = useState('')
  const [setupUri, setSetupUri] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const token = typeof window !== 'undefined' ? window.localStorage.getItem('scamshield_token') : null

  useEffect(() => {
    async function loadAccount() {
      if (!token) {
        setError('Please sign in to view your account.')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`${apiBase}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) {
          throw new Error('Session expired. Please log in again.')
        }
        setUser(await response.json())
        const statusData = await fetchTOTPStatus(token)
        setTotpEnabled(statusData.totp_enabled)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    loadAccount()
  }, [token])

  async function refreshTOTPStatus() {
    if (!token) return
    try {
      const statusData = await fetchTOTPStatus(token)
      setTotpEnabled(statusData.totp_enabled)
    } catch (err) {
      setStatusMessage((err as Error).message)
    }
  }

  async function handleSetup() {
    if (!token) return
    setActionLoading(true)
    setStatusMessage('')
    try {
      const data = await setupTOTP(token)
      setSetupSecret(data.secret)
      setSetupUri(data.provisioning_uri)
      setStatusMessage('Scan the QR code or copy the secret into your authenticator app.')
    } catch (err) {
      setStatusMessage((err as Error).message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleVerify() {
    if (!token) return
    if (!verificationCode.trim()) {
      setStatusMessage('Enter the 6-digit TOTP code from your authenticator app.')
      return
    }
    setActionLoading(true)
    setStatusMessage('')
    try {
      await verifyTOTP(token, verificationCode.trim())
      setStatusMessage('2FA enabled successfully. Your login is now protected.')
      setSetupSecret('')
      setSetupUri('')
      setVerificationCode('')
      await refreshTOTPStatus()
    } catch (err) {
      setStatusMessage((err as Error).message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDisable() {
    if (!token) return
    if (!disableCode.trim()) {
      setStatusMessage('Enter the current TOTP code to disable 2FA.')
      return
    }
    setActionLoading(true)
    setStatusMessage('')
    try {
      await disableTOTP(token, disableCode.trim())
      setStatusMessage('2FA disabled. You can still use your password to log in.')
      setDisableCode('')
      await refreshTOTPStatus()
    } catch (err) {
      setStatusMessage((err as Error).message)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-brand-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white">Your Account</h1>
              <p className="mt-2 text-slate-300">Manage session, password, and security settings.</p>
            </div>
            {user ? (
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/auth/change-password"
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-white hover:border-cyan-300"
                >
                  Change password
                </Link>
                <button
                  type="button"
                  onClick={() => logout('/')}
                  className="rounded-full bg-red-500/90 px-5 py-2 text-sm font-semibold text-white hover:bg-red-400"
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>

          {loading ? (
            <p className="mt-8 text-slate-400">Loading...</p>
          ) : error ? (
            <div className="mt-8 space-y-4">
              <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">{error}</div>
              <Link href="/auth/login" className="text-cyan-300">
                Go to login
              </Link>
            </div>
          ) : user ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-brand-900/80 p-6">
                <p className="text-sm uppercase tracking-widest text-cyan-300">Name</p>
                <p className="mt-3 text-2xl font-semibold">{user.name}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-brand-900/80 p-6">
                <p className="text-sm uppercase tracking-widest text-cyan-300">Email</p>
                <p className="mt-3 text-2xl font-semibold break-all">{user.email}</p>
              </div>
              <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-brand-900/80 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-widest text-cyan-300">Two-factor authentication</p>
                    <p className="mt-3 text-2xl font-semibold">
                      {totpEnabled ? 'Enabled' : totpEnabled === false ? 'Disabled' : 'Checking...'}
                    </p>
                  </div>
                  {!totpEnabled ? (
                    <button
                      type="button"
                      onClick={handleSetup}
                      disabled={actionLoading}
                      className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
                    >
                      {actionLoading ? 'Please wait...' : 'Enable 2FA'}
                    </button>
                  ) : null}
                </div>

                {setupUri ? (
                  <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
                      <p className="text-sm uppercase tracking-widest text-cyan-300">Authenticator QR</p>
                      <img
                        src={`https://chart.googleapis.com/chart?cht=qr&chs=240x240&chl=${encodeURIComponent(setupUri)}`}
                        alt="TOTP QR code"
                        className="mt-4 w-full max-w-[240px] rounded-3xl bg-white/10 p-4"
                      />
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
                      <p className="text-sm uppercase tracking-widest text-cyan-300">Secret key</p>
                      <div className="mt-4 rounded-3xl bg-white/5 p-4 text-slate-100">{setupSecret}</div>
                      <p className="mt-4 text-sm text-slate-400">
                        Add this account in Google Authenticator, Authy, or another TOTP app.
                      </p>
                      <label className="mt-6 block text-sm font-medium text-slate-200">Enter code</label>
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className="mt-3 w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4 outline-none focus:border-cyan-300"
                        placeholder="123456"
                        maxLength={6}
                      />
                      <button
                        type="button"
                        onClick={handleVerify}
                        disabled={actionLoading}
                        className="mt-4 rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
                      >
                        Verify and enable
                      </button>
                    </div>
                  </div>
                ) : null}

                {totpEnabled ? (
                  <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-6">
                    <p className="text-sm uppercase tracking-widest text-cyan-300">Disable 2FA</p>
                    <p className="mt-3 text-sm text-slate-400">
                      Enter your current authenticator code to turn off two-factor authentication.
                    </p>
                    <div className="mt-4">
                      <input
                        type="text"
                        value={disableCode}
                        onChange={(e) => setDisableCode(e.target.value)}
                        className="w-full rounded-3xl border border-white/10 bg-brand-900/70 px-5 py-4 outline-none focus:border-cyan-300"
                        placeholder="123456"
                        maxLength={6}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleDisable}
                      disabled={actionLoading}
                      className="mt-4 rounded-full bg-red-500/90 px-5 py-3 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-60"
                    >
                      Disable 2FA
                    </button>
                  </div>
                ) : null}

                {statusMessage ? (
                  <div className="mt-6 rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-cyan-100">{statusMessage}</div>
                ) : null}
              </div>

              <div className="lg:col-span-2 flex flex-wrap gap-3">
                <Link href="/report" className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950">
                  My reports
                </Link>
                <Link href="/scam-analyzer" className="rounded-full border border-white/10 px-5 py-2 text-sm text-white">
                  Scan a message
                </Link>
                <Link href="/admin" className="rounded-full border border-amber-400/30 px-5 py-2 text-sm text-amber-200">
                  Admin dashboard
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
