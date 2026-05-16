import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildMonthCalendarView, summarizeAttendanceMonth } from './summarizeMonth.js'

const MAY_2026 = [
  '2026-05-01',
  '2026-05-02',
  '2026-05-03',
  '2026-05-04',
  '2026-05-05',
  '2026-05-06',
  '2026-05-07',
  '2026-05-08',
  '2026-05-09',
  '2026-05-10',
  '2026-05-11',
  '2026-05-12',
  '2026-05-13',
  '2026-05-14',
  '2026-05-15',
  '2026-05-16',
]

const Z71_MAY = {
  '2026-05-01': { status: 'Early Exit' },
  '2026-05-04': { status: 'Present' },
  '2026-05-06': { status: 'Half Day' },
  '2026-05-07': { status: 'Late' },
  '2026-05-08': { status: 'Present' },
  '2026-05-11': { status: 'Present' },
  '2026-05-12': { status: 'Late' },
  '2026-05-13': { status: 'Early Exit' },
  '2026-05-14': { status: 'Present' },
  '2026-05-15': { status: 'Half Day' },
  '2026-05-16': { status: 'Present' },
}

describe('summarizeAttendanceMonth', () => {
  it('counts Present without Early Exit', () => {
    const s = summarizeAttendanceMonth(MAY_2026, Z71_MAY, { todayIso: '2026-05-16' })
    assert.equal(s.present, 5)
    assert.equal(s.earlyExit, 2)
    assert.equal(s.late, 2)
    assert.equal(s.halfDay, 2)
    assert.equal(s.absent, 5) // May 2,3,5,9,10 — no punch rows
  })

  it('marks gaps as Absent in calendar view (including weekends)', () => {
    const view = buildMonthCalendarView(MAY_2026, Z71_MAY, { todayIso: '2026-05-16' })
    assert.equal(view['2026-05-05']?.status, 'Absent')
    assert.equal(view['2026-05-02']?.status, 'Absent')
  })
})
