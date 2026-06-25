'use client'

import { useEffect, useState } from 'react'
import { getFastMode, setFastMode } from '@/lib/fastMode'
import { t, useLang } from '@/lib/i18n'

export default function FastModeToggle() {
  const [on, setOn] = useState(false)
  const { lang } = useLang()

  useEffect(() => {
    setOn(getFastMode())
  }, [])

  function toggle() {
    const next = !on
    setOn(next)
    setFastMode(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={t(lang, 'fastModeHint')}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        on
          ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
          : 'border-white/10 bg-white/5 text-slate-400'
      }`}
    >
      ⚡ {t(lang, 'fastMode')}{on ? ' ON' : ''}
    </button>
  )
}
