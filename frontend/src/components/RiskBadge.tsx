interface RiskBadgeProps {
  riskLevel: string
  score: number
}

export default function RiskBadge({ riskLevel, score }: RiskBadgeProps) {
  return (
    <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white">
      {riskLevel.replace('_', ' ').toUpperCase()} · Risk {score}/100
    </div>
  )
}
