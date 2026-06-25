import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import AppShell from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'ScamShield AI',
  description: 'AI powered social media scam detection and cybersecurity threat intelligence platform.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-brand-950 text-slate-100">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
