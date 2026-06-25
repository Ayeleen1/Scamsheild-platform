import Link from 'next/link'
import FeatureCard from '@/components/FeatureCard'

const features = [
  { title: 'Scam Message Analyzer', description: 'Quick scan + AI — battery saver mode skips deep AI.', href: '/scam-analyzer' },
  { title: 'AI Security Chat', description: 'WhatsApp-style chat for scam tips in English + Roman Urdu.', href: '/chat' },
  { title: 'Community Feed', description: 'See reported scams and shared blacklist (like social alerts).', href: '/community' },
  { title: 'URL / Link Scanner', description: 'Phishing check + community blacklist match.', href: '/url-scanner' },
  { title: 'Fake Profile Detector', description: 'Instagram, Facebook, TikTok, WhatsApp — AI + heuristics.', href: '/profile-checker' },
  { title: 'Image Verification', description: 'Heuristic checks on image URLs.', href: '/image-verification' },
  { title: 'Report Scam Activity', description: 'Logged-in reports auto-add to community blacklist.', href: '/report' },
  { title: 'Security Learning Center', description: 'Phishing, OTP, crypto and romance scam tips.', href: '/learn' },
]

export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl shadow-brand-900/30 backdrop-blur-xl">
          <div className="mb-12 space-y-6">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">AI Cyber Threat Intelligence</p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl text-white">ScamShield AI</h1>
            <p className="max-w-2xl text-lg text-slate-300">Build a secure social media scam detection hub with AI, fraud analysis, URL scanning, and user reporting.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {features.map((feature) => (
              <Link key={feature.title} href={feature.href} className="group">
                <FeatureCard title={feature.title} description={feature.description} />
              </Link>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Start your security scan</h2>
              <p className="mt-2 text-slate-300">Use the scanner pages to test messages, URLs, and social media profiles right now.</p>
            </div>
            <Link href="/scam-analyzer" className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
              Begin Message Scan
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-brand-900/80 p-8 shadow-xl shadow-brand-900/20">
            <h2 className="text-2xl font-semibold text-white">Start with risk scoring</h2>
            <p className="mt-4 text-slate-300">Input profile URLs, scam messages, or links to get instant AI risk classification and actionable security advice.</p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-brand-900/80 p-8 shadow-xl shadow-brand-900/20">
            <h2 className="text-2xl font-semibold text-white">Information security first</h2>
            <p className="mt-4 text-slate-300">Use encrypted auth, secure API design, and privacy-safe reporting for a cyber-aware user experience.</p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-brand-900/80 p-8 shadow-xl shadow-brand-900/20">
            <h2 className="text-2xl font-semibold text-white">Urdu + Roman Urdu ready</h2>
            <p className="mt-4 text-slate-300">Prepare your UI for local users with bilingual content and security awareness modules.</p>
          </article>
        </div>
      </section>
    </main>
  )
}
