import { calculateEmployeeDayStatus } from './employeeDayStatus.js'

/** @typedef {{ daysAgo: number, timeIn: string | null, timeOut: string | null }} DemoPunch */

/** Same sample schedule as mobile History demo. */
export const DEMO_ATTENDANCE_PUNCHES = /** @type {DemoPunch[]} */ ([
  { daysAgo: 18, timeIn: '10:00', timeOut: '18:00' },
  { daysAgo: 17, timeIn: '10:00', timeOut: '18:00' },
  { daysAgo: 16, timeIn: null, timeOut: null },
  { daysAgo: 15, timeIn: '10:22', timeOut: '18:00' },
  { daysAgo: 14, timeIn: '10:00', timeOut: '18:00' },
  { daysAgo: 13, timeIn: '10:00', timeOut: '17:10' },
  { daysAgo: 12, timeIn: '10:00', timeOut: '18:00' },
  { daysAgo: 11, timeIn: '11:15', timeOut: '18:00' },
  { daysAgo: 10, timeIn: '10:05', timeOut: '18:00' },
  { daysAgo: 9, timeIn: null, timeOut: null },
  { daysAgo: 8, timeIn: '10:00', timeOut: '18:00' },
  { daysAgo: 7, timeIn: '10:18', timeOut: '18:00' },
  { daysAgo: 6, timeIn: '10:00', timeOut: '16:45' },
  { daysAgo: 5, timeIn: '10:00', timeOut: '18:00' },
  { daysAgo: 4, timeIn: '10:00', timeOut: '18:00' },
  { daysAgo: 3, timeIn: '10:30', timeOut: '18:00' },
  { daysAgo: 2, timeIn: '10:00', timeOut: '18:00' },
  { daysAgo: 1, timeIn: '10:08', timeOut: '18:00' },
  { daysAgo: 0, timeIn: '10:02', timeOut: '17:55' },
])

function formatLocalDateIso(daysAgo) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * @param {{ intime: string, outtime: string, entry_buffer_minutes?: number, exit_buffer_minutes?: number }} policy
 * @returns {Record<string, { date: string, timeIn: string | null, timeOut: string | null, status: import('./employeeDayStatus.js').DayStatus }>}
 */
export function buildDemoAttendanceByDate(policy) {
  /** @type {Record<string, { date: string, timeIn: string | null, timeOut: string | null, status: import('./employeeDayStatus.js').DayStatus }>} */
  const result = {}

  for (const sample of DEMO_ATTENDANCE_PUNCHES) {
    const date = formatLocalDateIso(sample.daysAgo)
    const status = calculateEmployeeDayStatus(sample.timeIn, sample.timeOut, {
      shift_start_time: policy.intime,
      shift_end_time: policy.outtime,
      entry_buffer_minutes: policy.entry_buffer_minutes,
      exit_buffer_minutes: policy.exit_buffer_minutes,
    })
    result[date] = {
      date,
      timeIn: sample.timeIn,
      timeOut: sample.timeOut,
      status,
    }
  }

  return result
}

/**
 * @param {string} monthValue yyyy-MM
 * @param {{ intime: string, outtime: string }} policy
 * @returns {Record<string, string>} dateIso -> web calendar label (Present/Absent/Half Day)
 */
export function buildDemoCalendarStatusMap(monthValue, policy) {
  const demo = buildDemoAttendanceByDate({
    intime: policy.intime,
    outtime: policy.outtime,
    entry_buffer_minutes: 15,
    exit_buffer_minutes: 15,
  })
  const prefix = `${monthValue}-`
  /** @type {Record<string, string>} */
  const mapped = {}
  for (const [date, row] of Object.entries(demo)) {
    if (!date.startsWith(prefix)) continue
    mapped[date] = mapDayStatusToWebCalendar(row.status)
  }
  return mapped
}

/** @param {import('./employeeDayStatus.js').DayStatus} status */
export function mapDayStatusToWebCalendar(status) {
  if (status === 'Absent') return 'Absent'
  if (status === 'Half Day') return 'Half Day'
  if (status === 'Late') return 'Late'
  if (status === 'Early Exit') return 'Early Exit'
  return 'Present'
}
