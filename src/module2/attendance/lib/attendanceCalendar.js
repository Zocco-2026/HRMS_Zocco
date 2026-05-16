import { calculateEmployeeDayStatus } from '@ag-fashions/shared/attendance/employeeDayStatus'
import {
  buildDemoAttendanceByDate,
  buildDemoCalendarStatusMap,
  mapDayStatusToWebCalendar,
} from '@ag-fashions/shared/attendance/demoHistory'

/** @param {string | null | undefined} primaryStatus */
export function primaryStatusToWebLabel(primaryStatus) {
  const s = String(primaryStatus ?? '')
    .toLowerCase()
    .trim()
  if (s === 'present') return 'Present'
  if (s === 'late') return 'Late'
  if (s === 'early_exit' || s === 'early exit') return 'Early Exit'
  if (s === 'half_day' || s === 'half day') return 'Half Day'
  return 'Absent'
}

/**
 * Map canonical daily_attendance rows to calendar cells (preferred over punch grouping).
 * @param {Array<{ attendance_date: string, first_in_time?: string | null, last_out_time?: string | null, primary_status?: string }>} rows
 */
export function calendarFromDailyRows(rows) {
  /** @type {Record<string, { status: string, timeIn: string | null, timeOut: string | null }>} */
  const mapped = {}
  for (const row of rows ?? []) {
    const dateIso = String(row.attendance_date ?? '').slice(0, 10)
    if (!dateIso) continue
    mapped[dateIso] = {
      status: primaryStatusToWebLabel(row.primary_status),
      timeIn: row.first_in_time?.trim() || null,
      timeOut: row.last_out_time?.trim() || null,
    }
  }
  return mapped
}

export function shiftPolicyFromEmployee(employee) {
  const intime = String(employee?.intime ?? '').trim()
  const outtime = String(employee?.outtime ?? '').trim()
  if (!intime || !outtime) return null
  return { intime, outtime, entry_buffer_minutes: 15, exit_buffer_minutes: 15 }
}

/**
 * Group attendance_logs rows (with punch_type) into per-day status + times.
 * @param {Array<{ timestamp: string, punch_type?: string }>} rows
 * @param {{ intime: string, outtime: string, entry_buffer_minutes?: number, exit_buffer_minutes?: number }} policy
 */
export function calendarFromPunchRows(rows, policy) {
  /** @type {Record<string, { in?: string, out?: string }>} */
  const punchesByDate = {}

  for (const row of rows ?? []) {
    const ts = row.timestamp
    if (!ts) continue
    const dateObj = new Date(ts)
    if (Number.isNaN(dateObj.getTime())) continue
    const dateIso = ts.slice(0, 10)
    const hours = String(dateObj.getHours()).padStart(2, '0')
    const mins = String(dateObj.getMinutes()).padStart(2, '0')
    const timeStr = `${hours}:${mins}`
    const punchType = String(row.punch_type ?? 'in').toLowerCase()

    if (!punchesByDate[dateIso]) punchesByDate[dateIso] = {}

    if (punchType === 'in') {
      if (!punchesByDate[dateIso].in || punchesByDate[dateIso].in > timeStr) {
        punchesByDate[dateIso].in = timeStr
      }
    } else if (!punchesByDate[dateIso].out || punchesByDate[dateIso].out < timeStr) {
      punchesByDate[dateIso].out = timeStr
    }
  }

  /** @type {Record<string, { status: string, timeIn: string | null, timeOut: string | null }>} */
  const mapped = {}

  for (const [dateIso, punches] of Object.entries(punchesByDate)) {
    const timeIn = punches.in ?? null
    const timeOut = punches.out ?? null
    const dayStatus = calculateEmployeeDayStatus(timeIn, timeOut, {
      shift_start_time: policy.intime,
      shift_end_time: policy.outtime,
      entry_buffer_minutes: policy.entry_buffer_minutes,
      exit_buffer_minutes: policy.exit_buffer_minutes,
    })
    mapped[dateIso] = {
      status: mapDayStatusToWebCalendar(dayStatus),
      timeIn,
      timeOut,
    }
  }

  return mapped
}

/**
 * @param {string} monthValue yyyy-MM
 * @param {{ intime: string, outtime: string }} policy
 */
export function demoCalendarForMonth(monthValue, policy) {
  const demo = buildDemoAttendanceByDate({
    intime: policy.intime,
    outtime: policy.outtime,
    entry_buffer_minutes: 15,
    exit_buffer_minutes: 15,
  })
  const prefix = `${monthValue}-`
  /** @type {Record<string, { status: string, timeIn: string | null, timeOut: string | null, isDemo: boolean }>} */
  const mapped = {}
  for (const [date, row] of Object.entries(demo)) {
    if (!date.startsWith(prefix)) continue
    mapped[date] = {
      status: mapDayStatusToWebCalendar(row.status),
      timeIn: row.timeIn,
      timeOut: row.timeOut,
      isDemo: true,
    }
  }
  return mapped
}

/**
 * @param {string} monthValue
 * @param {{ intime: string, outtime: string }} policy
 * @returns {Record<string, string>}
 */
export function demoStatusCountsForMonth(monthValue, policy) {
  return buildDemoCalendarStatusMap(monthValue, policy)
}
