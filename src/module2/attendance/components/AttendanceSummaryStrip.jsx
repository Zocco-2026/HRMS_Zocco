const STAT_ITEMS = [
  {
    key: 'present',
    label: 'Present',
    dot: 'bg-[#22C55E]',
    card: 'bg-[#dcf5e6] ring-1 ring-[#9fd6b4]/60',
    labelClass: 'text-[#2d8a58]',
    valueClass: 'text-[#1b3452]',
  },
  {
    key: 'absent',
    label: 'Absent',
    dot: 'bg-[#EF4444]',
    card: 'bg-[#ffe2df] ring-1 ring-[#f0a6a2]/60',
    labelClass: 'text-[#bf4d47]',
    valueClass: 'text-[#1b3452]',
  },
  {
    key: 'late',
    label: 'Late',
    dot: 'bg-[#F97316]',
    card: 'bg-[#ffedd5] ring-1 ring-[#fdba74]/60',
    labelClass: 'text-[#c2410c]',
    valueClass: 'text-[#1b3452]',
  },
  {
    key: 'halfDay',
    label: 'Half Day',
    dot: 'bg-[#0EA5E9]',
    card: 'bg-[#fff2d9] ring-1 ring-[#eac98c]/60',
    labelClass: 'text-[#b07621]',
    valueClass: 'text-[#1b3452]',
  },
]

/**
 * Attendance summary matching web-admin light theme (same counts as mobile History).
 */
export function AttendanceSummaryStrip({ summary, monthLabel = '', className = '' }) {
  const { present, absent, late, halfDay, earlyExit = 0, percentage } = summary
  const values = { present, absent, late, halfDay }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-4 rounded-3xl border border-[#d2e4eb] bg-white/95 px-5 py-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7088a1]">
            Attendance Rate{monthLabel ? ` — ${monthLabel}` : ''}
          </p>
          {earlyExit > 0 ? (
            <p className="mt-1 text-xs text-[#a16207]">Early exit: {earlyExit} (calendar only)</p>
          ) : null}
          <p className="mt-1 text-3xl font-semibold tracking-tight text-[#193250]">{percentage}%</p>
        </div>
        <div className="h-2.5 w-32 overflow-hidden rounded-full bg-[#edf6fb] sm:w-40">
          <div
            className="h-full rounded-full bg-[#3ba66b] transition-all"
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT_ITEMS.map(({ key, label, dot, card, labelClass, valueClass }) => (
          <div
            key={key}
            className={`flex flex-col items-center rounded-2xl px-3 py-4 shadow-sm ${card}`}
          >
            <div className="mb-2 flex items-center gap-1.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
              <span className={`text-xs font-semibold ${labelClass}`}>{label}</span>
            </div>
            <span className={`text-2xl font-semibold tabular-nums ${valueClass}`}>
              {values[key] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
