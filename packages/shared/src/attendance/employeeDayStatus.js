import {
  computeDayAttendanceFromTimes,
  primaryStatusToLabel,
} from './attendanceEngine.js'

/** @typedef {'Present' | 'Late' | 'Early Exit' | 'Half Day' | 'Absent'} DayStatus */

/** @typedef {{ shift_start_time: string, shift_end_time: string, entry_buffer_minutes?: number, exit_buffer_minutes?: number }} ShiftPolicy */

export function parseClockTime(timeStr) {
  if (!timeStr) return 0
  const [hours, minutes] = String(timeStr).split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * @deprecated Use attendanceEngine.computeDayAttendanceFromTimes
 */
export function calculateEmployeeDayStatus(timeIn, timeOut, policy) {
  const row = computeDayAttendanceFromTimes({ timeIn, timeOut, policy })
  return primaryStatusToLabel(row.primary_status)
}

/** @param {DayStatus} status */
export function dayStatusToWebLabel(status) {
  if (status === 'Early Exit') return 'Early Exit'
  return status
}
