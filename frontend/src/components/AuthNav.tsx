'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { API_BASE } from '@/lib/api'

const apiBase = API_BASE

interface UserInfo {
  name: string
  email: string
}

export default function AuthNav() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const storedToken = window.localStorage.getItem('scamshield_token')
    setToken(storedToken)
  }, [])

  useEffect(() => {
    if (!token) {
      setUser(null)
      return
    }

    async function fetchUser() {
      setLoading(true)
      try {
        const response = await fetch(`${apiBase}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          window.localStorage.removeItem('scamshield_token')
          setToken(null)
          setUser(null)
          return
        }

        const data = await response.json()
        setUser(data)
      } catch (error) {
        window.localStorage.removeItem('scamshield_token')
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [token])

  function handleLogout() {
    window.localStorage.removeItem('scamshield_token')
    setToken(null)
    setUser(null)
    router.push('/')
  }

  if (!token) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/auth/login" className="text-sm text-slate-300 transition hover:text-white">
          Login
        </Link>
        <Link href="/auth/register" className="rounded-full border border-white/10 bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
          Register
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100">
        {loading ? 'Checking...' : user ? `Welcome, ${user.name}` : 'Signed in'}
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-full border border-red-400/50 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/40"
      >
        Logout
      </button>
    </div>
  )
}
