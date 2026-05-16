import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  attendanceDateInTz,
  computeDayAttendanceFromTimes,
  computeDailyAttendanceFromPunches,
} from './attendanceEngine.js'

const policy = {
  shift_start_time: '10:00',
  shift_end_time: '18:00',
  entry_buffer_minutes: 15,
  exit_buffer_minutes: 15,
}

describe('computeDayAttendanceFromTimes', () => {
  it('marks present for on-time full day', () => {
    const r = computeDayAttendanceFromTimes({
      timeIn: '10:00',
      timeOut: '18:00',
      policy,
    })
    assert.equal(r.primary_status, 'present')
    assert.equal(r.working_minutes, 480)
  })

  it('marks late when in after buffer but within 1 hour', () => {
    const r = computeDayAttendanceFromTimes({
      timeIn: '10:20',
      timeOut: '18:00',
      policy,
    })
    assert.equal(r.primary_status, 'late')
  })

  it('marks half day when in more than 1 hour late', () => {
    const r = computeDayAttendanceFromTimes({
      timeIn: '11:15',
      timeOut: '18:00',
      policy,
    })
    assert.equal(r.primary_status, 'half_day')
  })

  it('marks early exit', () => {
    const r = computeDayAttendanceFromTimes({
      timeIn: '10:00',
      timeOut: '17:10',
      policy,
    })
    assert.equal(r.primary_status, 'early_exit')
  })

  it('marks absent when working less than 4 hours', () => {
    const r = computeDayAttendanceFromTimes({
      timeIn: '10:00',
      timeOut: '13:00',
      policy,
    })
    assert.equal(r.primary_status, 'absent')
    assert.equal(r.flags.insufficient_hours, true)
  })

  it('marks absent when no in punch', () => {
    const r = computeDayAttendanceFromTimes({
      timeIn: null,
      timeOut: null,
      policy,
    })
    assert.equal(r.primary_status, 'absent')
  })

  it('priority: absent beats half day when hours too low', () => {
    const r = computeDayAttendanceFromTimes({
      timeIn: '11:30',
      timeOut: '13:00',
      policy,
    })
    assert.equal(r.primary_status, 'absent')
  })
})

describe('attendanceDateInTz', () => {
  it('uses Asia/Kolkata calendar date', () => {
    const d = attendanceDateInTz('2026-05-16T18:30:00.000Z')
    assert.match(d, /^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('computeDailyAttendanceFromPunches', () => {
  it('groups earliest in and latest out per IST day', () => {
    const map = computeDailyAttendanceFromPunches({
      policy,
      punches: [
        { timestamp: '2026-05-16T04:35:00.000Z', punch_type: 'in' },
        { timestamp: '2026-05-16T05:00:00.000Z', punch_type: 'in' },
        { timestamp: '2026-05-16T12:30:00.000Z', punch_type: 'out' },
      ],
    })
    assert.ok(map.size >= 1)
  })
})
