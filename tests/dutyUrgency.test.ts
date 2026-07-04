import { describe, it, expect } from 'vitest'
import { dutyUrgency } from '../lib/dutyStatus'

// daysUntilDue is precomputed by the caller (lib/relativeDate.daysFromToday),
// so these tests exercise the classification rules directly.

describe('dutyUrgency', () => {
  it('is silent without a due date', () => {
    expect(dutyUrgency({ status: 'pending' }, null)).toBeNull()
  })

  it('only applies to duties the member still has to act on', () => {
    expect(dutyUrgency({ status: 'completed' }, -3)).toBeNull()
    expect(dutyUrgency({ status: 'reviewed' }, 0)).toBeNull()
    expect(dutyUrgency({ status: 'pending' }, -3)).not.toBeNull()
    expect(dutyUrgency({ status: 'in_progress' }, 0)).not.toBeNull()
  })

  it('classifies overdue with day counts', () => {
    expect(dutyUrgency({ status: 'pending' }, -1)).toMatchObject({ level: 'overdue', label: 'Overdue by 1 day' })
    expect(dutyUrgency({ status: 'pending' }, -5)).toMatchObject({ level: 'overdue', label: 'Overdue by 5 days' })
  })

  it('classifies today and the soon window', () => {
    expect(dutyUrgency({ status: 'pending' }, 0)).toMatchObject({ level: 'today', label: 'Due today' })
    expect(dutyUrgency({ status: 'pending' }, 1)).toMatchObject({ level: 'soon', label: 'Due tomorrow' })
    expect(dutyUrgency({ status: 'pending' }, 3)).toMatchObject({ level: 'soon', label: 'Due in 3 days' })
  })

  it('goes quiet beyond three days out', () => {
    expect(dutyUrgency({ status: 'pending' }, 4)).toBeNull()
  })
})
