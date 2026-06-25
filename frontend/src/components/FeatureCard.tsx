type FeatureCardProps = {
  title: string
  description: string
}

export default function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <div className="group rounded-3xl border border-white/10 bg-brand-900/80 p-6 shadow-xl shadow-brand-900/20 transition hover:-translate-y-1 hover:border-cyan-300/40 hover:shadow-cyan-500/20">
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="mt-3 text-slate-300">{description}</p>
    </div>
  )
}
