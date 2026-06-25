'use client'

import Link from 'next/link'
import { type ReactNode } from 'react'
import AuthNav from '@/components/AuthNav'
import FastModeToggle from '@/components/FastModeToggle'
import MobileNav from '@/components/MobileNav'
import { LangProvider, t, useLang } from '@/lib/i18n'

const navLinks = [
  { href: '/scam-analyzer', key: 'message' as const },
  { href: '/url-scanner', key: 'url' as const },
  { href: '/profile-checker', key: 'profile' as const },
  { href: '/file-scanner', key: 'image' as const },
  { href: '/chat', key: 'chat' as const },
  { href: '/community', key: 'community' as const },
  { href: '/learn', key: 'learn' as const },
]

function ShellContent({ children }: { children: ReactNode }) {
  const { lang, setLang } = useLang()

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/95 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="text-lg font-semibold text-white sm:text-xl">
              ScamShield
            </Link>
            <div className="flex items-center gap-2">
              <FastModeToggle />
              <button
                type="button"
                onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
                className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-300"
              >
                {lang === 'en' ? 'UR' : 'EN'}
              </button>
              <AuthNav />
            </div>
          </div>
          <nav className="mt-2 hidden flex-wrap gap-2 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:text-white"
              >
                {t(lang, link.key)}
              </Link>
            ))}
            <Link
              href="/report"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:text-white"
            >
              {t(lang, 'report')}
            </Link>
          </nav>
        </div>
      </header>
      <div className="pb-20 md:pb-0">{children}</div>
      <MobileNav />
    </>
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <ShellContent>{children}</ShellContent>
    </LangProvider>
  )
}
