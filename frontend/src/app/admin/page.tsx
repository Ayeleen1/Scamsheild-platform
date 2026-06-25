'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchAdminEvents, fetchAdminStats } from '@/lib/api'
import { getToken } from '@/lib/auth'

export default function AdminPage() {
  const [stats, setStats] = useState<{ users: number; reports: number; blacklist_entries: number } | null>(null)
  const [events, setEvents] = useState<
    Array<{ id: string; event_type: string; severity: string; actor: string; target: string; created_at: string }>
  >([])
  const [error, setError] = useState('')

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setError('Login required.')
      return
    }
    Promise.all([fetchAdminStats(token), fetchAdminEvents(token, 120)])
      .then(([statsData, eventsData]) => {
        setStats(statsData)
        setEvents(eventsData.events)
      })
      .catch((e) => setError((e as Error).message))
  }, [])

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-white">Admin Dashboard</h1>
      <p className="mt-2 text-sm text-slate-400">
        Set <code className="text-cyan-300">ADMIN_EMAIL</code> in backend .env to your account email, then register/login.
      </p>
      {error ? (
        <p className="mt-6 text-red-300">{error}</p>
      ) : stats ? (
        <div className="mt-8 space-y-8">
          <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-3xl font-bold text-cyan-300">{stats.users}</p>
            <p className="text-slate-400">Users</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-3xl font-bold text-cyan-300">{stats.reports}</p>
            <p className="text-slate-400">Reports</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-3xl font-bold text-cyan-300">{stats.blacklist_entries}</p>
            <p className="text-slate-400">Blacklist entries</p>
          </div>
          </div>
          <section>
            <h2 className="text-lg font-semibold text-white">SIEM Security Events</h2>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-white/5 text-left text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((evt) => (
                    <tr key={evt.id} className="border-t border-white/10">
                      <td className="px-4 py-3 text-slate-400">{new Date(evt.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            evt.severity === 'high'
                              ? 'bg-red-500/20 text-red-300'
                              : evt.severity === 'medium'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {evt.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-200">{evt.event_type}</td>
                      <td className="px-4 py-3 text-slate-300">{evt.actor || '-'}</td>
                      <td className="px-4 py-3 text-slate-400">{evt.target || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <p className="mt-6 text-slate-500">Loading…</p>
      )}
      <Link href="/account" className="mt-8 inline-block text-sm text-cyan-300 hover:underline">
        ← Account
      </Link>
    </main>
  )
}
