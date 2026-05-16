/**
 * Canonical attendance day engine — single source of truth for mobile, web, and DB parity tests.
 * Attendance calendar day boundary: Asia/Kolkata unless overridden.
 */

export const ATTENDANCE_TZ = 'Asia/Kolkata'

/** @typedef {'present' | 'late' | 'early_exit' | 'half_day' | 'absent'} PrimaryStatus */

/**
 * @typedef {object} ShiftPolicy
 * @property {string} shift_start_time HH:mm
 * @property {string} shift_end_time HH:mm
 * @property {number} [entry_buffer_minutes]
 * @property {number} [exit_buffer_minutes]
 */

/**
 * @typedef {object} PunchInput
 * @property {string|Date} timestamp
 * @property {'in'|'out'} punch_type
 */

/**
 * @typedef {object} DayAttendanceResult
 * @property {string} attendance_date YYYY-MM-DD (IST)
 * @property {string|null} first_in_time HH:mm
 * @property {string|null} last_out_time HH:mm
 * @property {number} working_minutes
 * @property {PrimaryStatus} primary_status
 * @property {Record<string, boolean>} flags
 * @property {boolean} is_present
 * @property {boolean} is_late
 * @property {boolean} is_early_exit
 * @property {boolean} is_half_day
 * @property {boolean} is_absent
 */

/**
 * @param {string|undefined|null} raw
 * @param {number} [defaultMinutes]
 */
export function parseClockToMinutes(raw, defaultMinutes = 0) {
  const s = String(raw ?? '').trim()
  if (!s) return defaultMinutes
  const parts = s.split(':')
  const h = Number(parts[0])
  const m = parts[1] != null ? Number(parts[1]) : 0
  if (!Number.isFinite(h) || !Number.isFinite(m)) return defaultMinutes
  return h * 60 + m
}

/**
 * @param {string|Date|number} input
 */
export function toDate(input) {
  if (input instanceof Date) return Number.isFinite(input.getTime()) ? input : null
  const d = new Date(input)
  return Number.isFinite(d.getTime()) ? d : null
}

/**
 * @param {Date} date
 * @param {string} [timeZone]
 */
export function minutesInTimeZone(date, timeZone = ATTENDANCE_TZ) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date)
    const h = Number(parts.find((p) => p.type === 'hour')?.value)
    const m = Number(parts.find((p) => p.type === 'minute')?.value)
    if (!Number.isFinite(h) || !Number.isFinite(m)) {
      return date.getHours() * 60 + date.getMinutes()
    }
    return h * 60 + m
  } catch {
    return date.getHours() * 60 + date.getMinutes()
  }
}

/**
 * @param {string|Date|number} ts
 * @param {string} [timeZone]
 * @returns {string} YYYY-MM-DD
 */
export function attendanceDateInTz(ts, timeZone = ATTENDANCE_TZ) {
  const d = toDate(ts)
  if (!d) return ''
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d)
  } catch {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
}

/**
 * @param {Date} date
 * @param {string} [timeZone]
 */
export function formatClockInTz(date, timeZone = ATTENDANCE_TZ) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date)
    const h = parts.find((p) => p.type === 'hour')?.value ?? '00'
    const m = parts.find((p) => p.type === 'minute')?.value ?? '00'
    return `${h}:${m}`
  } catch {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
}

/**
 * @param {PunchInput[]} punches
 * @param {string} [timeZone]
 * @returns {Map<string, { in?: string, out?: string, inTs?: Date, outTs?: Date }>}
 */
export function groupPunchesByAttendanceDate(punches, timeZone = ATTENDANCE_TZ) {
  /** @type {Map<string, { in?: string, out?: string, inTs?: Date, outTs?: Date }>} */
  const map = new Map()

  for (const row of punches ?? []) {
    const d = toDate(row.timestamp)
    if (!d) continue
    const dateKey = attendanceDateInTz(d, timeZone)
    if (!dateKey) continue
    const clock = formatClockInTz(d, timeZone)
    const type = String(row.punch_type ?? 'in').toLowerCase()

    if (!map.has(dateKey)) map.set(dateKey, {})
    const bucket = map.get(dateKey)

    if (type === 'in') {
      if (!bucket.in || clock < bucket.in) {
        bucket.in = clock
        bucket.inTs = d
      }
    } else if (!bucket.out || clock > bucket.out) {
      bucket.out = clock
      bucket.outTs = d
    }
  }

  return map
}

/**
 * @param {object} input
 * @param {string|null|undefined} input.timeIn HH:mm
 * @param {string|null|undefined} input.timeOut HH:mm
 * @param {ShiftPolicy} input.policy
 * @returns {DayAttendanceResult}
 */
export function computeDayAttendanceFromTimes({ timeIn, timeOut, policy, attendance_date = '' }) {
  const entryBuffer = Number.isFinite(policy.entry_buffer_minutes)
    ? policy.entry_buffer_minutes
    : 15
  const exitBuffer = Number.isFinite(policy.exit_buffer_minutes) ? policy.exit_buffer_minutes : 15
  const startMin = parseClockToMinutes(policy.shift_start_time, 9 * 60 + 30)
  const endMin = parseClockToMinutes(policy.shift_end_time, 18 * 60)

  const flags = {}

  if (!timeIn) {
    return finalizeDay({
      attendance_date,
      first_in_time: null,
      last_out_time: timeOut ?? null,
      working_minutes: 0,
      primary_status: 'absent',
      flags: { no_in: true },
    })
  }

  const inMin = parseClockToMinutes(timeIn)
  const outMin = timeOut ? parseClockToMinutes(timeOut) : null
  let workingMinutes = 0
  if (outMin != null) {
    workingMinutes = Math.max(0, outMin - inMin)
  }

  if (outMin != null && workingMinutes < 240) {
    return finalizeDay({
      attendance_date,
      first_in_time: timeIn,
      last_out_time: timeOut,
      working_minutes: workingMinutes,
      primary_status: 'absent',
      flags: { insufficient_hours: true },
    })
  }

  if (inMin > startMin + 60) {
    flags.half_day_late_in = true
    return finalizeDay({
      attendance_date,
      first_in_time: timeIn,
      last_out_time: timeOut,
      working_minutes: workingMinutes,
      primary_status: 'half_day',
      flags,
    })
  }

  if (outMin != null && outMin < endMin - 60) {
    flags.half_day_early_out = true
    return finalizeDay({
      attendance_date,
      first_in_time: timeIn,
      last_out_time: timeOut,
      working_minutes: workingMinutes,
      primary_status: 'half_day',
      flags,
    })
  }

  const isLate = inMin > startMin + entryBuffer && inMin <= startMin + 60
  const isEarlyExit =
    outMin != null && outMin >= endMin - 60 && outMin < endMin - exitBuffer

  if (isLate) flags.late = true
  if (isEarlyExit) flags.early_exit = true

  if (isLate && isEarlyExit) {
    return finalizeDay({
      attendance_date,
      first_in_time: timeIn,
      last_out_time: timeOut,
      working_minutes: workingMinutes,
      primary_status: 'late',
      flags,
    })
  }

  if (isLate) {
    return finalizeDay({
      attendance_date,
      first_in_time: timeIn,
      last_out_time: timeOut,
      working_minutes: workingMinutes,
      primary_status: 'late',
      flags,
    })
  }

  if (isEarlyExit) {
    return finalizeDay({
      attendance_date,
      first_in_time: timeIn,
      last_out_time: timeOut,
      working_minutes: workingMinutes,
      primary_status: 'early_exit',
      flags,
    })
  }

  const meetsPresent =
    inMin <= startMin + entryBuffer &&
    (outMin == null || outMin >= endMin - exitBuffer) &&
    (outMin == null || workingMinutes >= 240)

  if (meetsPresent) {
    return finalizeDay({
      attendance_date,
      first_in_time: timeIn,
      last_out_time: timeOut,
      working_minutes: workingMinutes,
      primary_status: 'present',
      flags,
    })
  }

  return finalizeDay({
    attendance_date,
    first_in_time: timeIn,
    last_out_time: timeOut,
    working_minutes: workingMinutes,
    primary_status: 'absent',
    flags: { ...flags, unclassified: true },
  })
}

/**
 * @param {object} input
 * @param {PunchInput[]} input.punches
 * @param {ShiftPolicy} input.policy
 * @param {string} [input.timeZone]
 * @returns {Map<string, DayAttendanceResult>}
 */
export function computeDailyAttendanceFromPunches({ punches, policy, timeZone = ATTENDANCE_TZ }) {
  const grouped = groupPunchesByAttendanceDate(punches, timeZone)
  /** @type {Map<string, DayAttendanceResult>} */
  const results = new Map()

  for (const [dateKey, bucket] of grouped.entries()) {
    results.set(
      dateKey,
      computeDayAttendanceFromTimes({
        attendance_date: dateKey,
        timeIn: bucket.in ?? null,
        timeOut: bucket.out ?? null,
        policy,
      }),
    )
  }

  return results
}

/**
 * @param {Partial<DayAttendanceResult> & { primary_status: PrimaryStatus, flags?: Record<string, boolean> }} row
 * @returns {DayAttendanceResult}
 */
function finalizeDay(row) {
  const status = row.primary_status
  return {
    attendance_date: row.attendance_date ?? '',
    first_in_time: row.first_in_time ?? null,
    last_out_time: row.last_out_time ?? null,
    working_minutes: row.working_minutes ?? 0,
    primary_status: status,
    flags: row.flags ?? {},
    is_present: status === 'present',
    is_late: status === 'late',
    is_early_exit: status === 'early_exit',
    is_half_day: status === 'half_day',
    is_absent: status === 'absent',
  }
}

/** UI label helper */
export function primaryStatusToLabel(status) {
  switch (status) {
    case 'present':
      return 'Present'
    case 'late':
      return 'Late'
    case 'early_exit':
      return 'Early Exit'
    case 'half_day':
      return 'Half Day'
    case 'absent':
    default:
      return 'Absent'
  }
}
