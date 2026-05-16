/**
 * Month-wise attendance summary (matches calendar labels; dates as YYYY-MM-DD).
 */

function parseIso(iso) {
  const d = new Date(`${iso}T12:00:00`)
  return Number.isFinite(d.getTime()) ? d : null
}

/**
 * @param {string} iso YYYY-MM-DD
 * @param {Record<string, { status?: string, timeIn?: string | null, timeOut?: string | null } | string>} calendarByDate
 * @param {{ todayIso?: string }} [options]
 */
export function summarizeAttendanceMonth(monthDayIsos, calendarByDate, options = {}) {
  const todayIso = options.todayIso ?? new Date().toISOString().slice(0, 10)

  let present = 0
  let absent = 0
  let late = 0
  let halfDay = 0
  let earlyExit = 0

  for (const iso of monthDayIsos ?? []) {
    if (iso > todayIso) continue

    const entry = calendarByDate?.[iso]
    const st = (typeof entry === 'string' ? entry : entry?.status) ?? ''

    if (!st) {
      absent += 1
      continue
    }

    if (st === 'Present') present += 1
    else if (st === 'Absent') absent += 1
    else if (st === 'Late') late += 1
    else if (st === 'Half Day') halfDay += 1
    else if (st === 'Early Exit') earlyExit += 1
  }

  const accountable = present + absent + late + halfDay + earlyExit
  const percentage =
    accountable > 0
      ? Math.round(((present + late + earlyExit + halfDay * 0.5) / accountable) * 100)
      : 0

  return {
    present,
    absent,
    late,
    halfDay,
    earlyExit,
    percentage,
    total: accountable,
  }
}

/**
 * Fill gaps as Absent for calendar display (only past/today dates in month).
 * @param {string[]} monthDayIsos
 * @param {Record<string, { status?: string, timeIn?: string | null, timeOut?: string | null }>} calendarByDate
 * @param {{ todayIso?: string }} [options]
 */
export function buildMonthCalendarView(monthDayIsos, calendarByDate, options = {}) {
  const todayIso = options.todayIso ?? new Date().toISOString().slice(0, 10)
  /** @type {Record<string, { status: string, timeIn: string | null, timeOut: string | null }>} */
  const merged = {}

  for (const [iso, entry] of Object.entries(calendarByDate ?? {})) {
    if (!entry) continue
    const st = typeof entry === 'string' ? entry : entry.status
    if (!st) continue
    merged[iso] = {
      status: st,
      timeIn: typeof entry === 'string' ? null : (entry.timeIn ?? null),
      timeOut: typeof entry === 'string' ? null : (entry.timeOut ?? null),
    }
  }

  for (const iso of monthDayIsos ?? []) {
    if (iso > todayIso) continue
    if (merged[iso]) continue
    merged[iso] = { status: 'Absent', timeIn: null, timeOut: null }
  }

  return merged
}

/** @deprecated Use summarizeAttendanceMonth */
export function summarizeAttendanceCalendar(calendarByDate) {
  const isos = Object.keys(calendarByDate ?? {}).sort()
  return summarizeAttendanceMonth(isos, calendarByDate)
}
