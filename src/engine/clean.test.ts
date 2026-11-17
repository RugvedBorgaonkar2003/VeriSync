import { describe, expect, it } from 'vitest'
import { cleanLeads, normalizeEmail, normalizePhone, parseDate } from './clean'

const settings = { nameColumn: 'Name', phoneColumn: 'Phone', emailColumn: 'Email', sourceColumn: 'Source', dateColumn: 'Date', statusColumn: 'Status', dateFormat: 'DMY' as const, periodStart: '2026-01-01', periodEnd: '2026-03-31' }

describe('lead cleaning engine', () => {
  it('normalizes Indian phone and email values', () => {
    expect(normalizePhone('+91 98765-43210')).toBe('9876543210')
    expect(normalizePhone('9999999999')).toBe('')
    expect(normalizeEmail('  Rahul@Example.COM ')).toBe('rahul@example.com')
  })

  it('parses supported dates deterministically', () => {
    expect(parseDate('18/03/2026', 'DMY')).toBe('2026-03-18')
    expect(parseDate('2026-03-18T10:00:00', 'DMY')).toBe('2026-03-18')
  })

  it('applies precedence and preserves the waterfall invariant', () => {
    const result = cleanLeads([
      { Name: 'Asha Rao', Phone: '09876543210', Email: 'asha@example.com', Source: 'Meta', Date: '01/03/2026', Status: 'New' },
      { Name: 'Asha Rao', Phone: '+91 98765 43210', Email: 'ASHA@example.com', Source: 'Meta', Date: '02/03/2026', Status: 'New' },
      { Name: 'Test', Phone: '9999999999', Email: '', Source: 'Meta', Date: '03/03/2026', Status: 'New' },
      { Name: 'Outside', Phone: '9876543211', Email: 'outside@example.com', Source: 'Google', Date: '03/04/2026', Status: 'New' },
    ], settings)
    expect(result.rows.map((row) => row.reasonCode)).toEqual(['VERIFIED', 'DUPLICATE', 'INVALID_OR_JUNK', 'OUT_OF_PERIOD'])
    expect(result.waterfall.total).toBe(result.waterfall.outOfPeriod + result.waterfall.invalidJunk + result.waterfall.duplicates + result.waterfall.verified)
  })
})
