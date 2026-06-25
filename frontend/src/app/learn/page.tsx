const tips = [
  {
    title: 'OTP fraud',
    en: 'Banks never ask for OTP via SMS links. Never share OTP with strangers.',
    ur: 'Bank OTP kabhi link par nahi mangta. OTP kisi ko na do.',
  },
  {
    title: 'Phishing links',
    en: 'Check the domain carefully. faceb00k-login.xyz is fake.',
    ur: 'Link ka domain check karo. Galat spelling = scam.',
  },
  {
    title: 'Fake giveaways',
    en: 'Free iPhone / prize messages with payment fees are scams.',
    ur: 'Free gift + paise mangna = fraud.',
  },
  {
    title: 'Crypto & investment',
    en: 'Guaranteed profit and USDT urgency are red flags.',
    ur: '100% profit guarantee jhoot hai.',
  },
  {
    title: 'Job scams',
    en: 'Registration fee before job = scam.',
    ur: 'Job se pehle paisa = fake job.',
  },
  {
    title: 'Romance scams',
    en: 'Online love + urgent money transfer = fraud.',
    ur: 'Pyar ka bahana + paisa = scam.',
  },
]

export default function LearnPage() {
  return (
    <main className="min-h-screen bg-brand-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Cyber Awareness</p>
          <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Security Learning Center</h1>
          <p className="mt-3 text-slate-300">
            Roman Urdu + English tips for Pakistani users. Use ScamShield scanners to verify suspicious content.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {tips.map((tip) => (
              <article key={tip.title} className="rounded-3xl border border-white/10 bg-brand-900/80 p-6">
                <h2 className="text-lg font-semibold text-cyan-300">{tip.title}</h2>
                <p className="mt-3 text-slate-200">{tip.en}</p>
                <p className="mt-2 text-slate-400">{tip.ur}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-cyan-300/20 bg-cyan-500/10 p-6">
            <h2 className="text-xl font-semibold text-white">Quick rules</h2>
            <ul className="mt-4 list-inside list-disc space-y-2 text-slate-300">
              <li>Unknown links mat kholo</li>
              <li>OTP / PIN kabhi share na karo</li>
              <li>Official app se verify karo, SMS link se nahi</li>
              <li>Bohat fast profit = scam</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}
