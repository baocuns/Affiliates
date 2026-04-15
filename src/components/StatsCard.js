'use client';

export default function StatsCard({ icon, label, value, subtext, color = 'primary' }) {
  const colorMap = {
    primary: { bg: 'from-primary/10 to-accent/10', text: 'text-primary', border: 'border-primary/10' },
    success: { bg: 'from-emerald-50 to-green-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    warning: { bg: 'from-amber-50 to-yellow-50', text: 'text-amber-600', border: 'border-amber-100' },
    info: { bg: 'from-blue-50 to-indigo-50', text: 'text-blue-600', border: 'border-blue-100' },
    purple: { bg: 'from-purple-50 to-violet-50', text: 'text-purple-600', border: 'border-purple-100' },
  };

  const c = colorMap[color] || colorMap.primary;

  return (
    <div className={`stats-card bg-gradient-to-br ${c.bg} border ${c.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xl ${c.text}`}>{icon}</span>
      </div>
      <p className="stats-card-value">{value}</p>
      <p className="stats-card-label">{label}</p>
      {subtext && <p className="stats-card-subtext">{subtext}</p>}
    </div>
  );
}
