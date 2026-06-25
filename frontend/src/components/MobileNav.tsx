'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { t, useLang } from '@/lib/i18n'

const tabs = [
  { href: '/', icon: '🏠', key: 'home' as const },
  { href: '/scam-analyzer', icon: '💬', key: 'message' as const },
  { href: '/file-scanner', icon: '🛡️', key: 'image' as const },
  { href: '/chat', icon: '🤖', key: 'chat' as const },
  { href: '/community', icon: '👥', key: 'community' as const },
]

export default function MobileNav() {
  const path = usePathname()
  const { lang } = useLang()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-lg justify-around px-1 py-2">
        {tabs.map((tab) => {
          const active = path === tab.href || (tab.href !== '/' && path.startsWith(tab.href))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-w-[56px] flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[10px] transition ${
                active ? 'text-cyan-300' : 'text-slate-500'
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span>{t(lang, tab.key)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
