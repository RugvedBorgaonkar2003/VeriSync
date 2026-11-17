import type { CleanResult, CleaningSettings, Lead, RawLead } from './types'

const disposable = new Set(['mailinator.com', 'yopmail.com', 'tempmail.com', 'guerrillamail.com', '10minutemail.com'])
const junkNames = new Set(['test', 'asdf', 'xxx', 'testing', 'dummy', 'sample'])

export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''
}

export function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('0091') && digits.slice(4).length === 10) digits = digits.slice(4)
  if (digits.startsWith('91') && digits.slice(2).length === 10) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  const repeated = /^(\d)\1{9}$/.test(digits)
  const sequential = digits === '1234567890' || digits === '0123456789'
  return /^\d{10}$/.test(digits) && /^[6-9]/.test(digits) && !repeated && !sequential ? digits : ''
}

export function parseDate(value: string, format: CleaningSettings['dateFormat']) {
  const raw = value.trim()
  if (!raw) return ''
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const parts = raw.replaceAll('-', '/').replaceAll('.', '/').split('/').map(Number)
  if (parts.length >= 3 && parts.every(Number.isFinite)) {
    const [first, second, third] = parts
    const year = first > 31 ? first : third
    const month = first > 31 ? second : format === 'DMY' ? second : first
    const day = first > 31 ? third : format === 'DMY' ? first : second
    if (year && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const date = new Date(Date.UTC(year < 100 ? year + 2000 : year, month - 1, day))
      if (date.getUTCMonth() === month - 1 && date.getUTCDate() === day) return date.toISOString().slice(0, 10)
    }
  }
  return ''
}

function isForeignNumber(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 10 && !normalizePhone(value)
}

function compareCreated(a: Lead, b: Lead) {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
}

export function cleanLeads(rows: RawLead[], settings: CleaningSettings): CleanResult {
  const leads: Lead[] = rows.map((row, index) => {
    const name = normalizeName(row[settings.nameColumn] ?? '')
    const email = normalizeEmail(row[settings.emailColumn] ?? '')
    const rawPhone = row[settings.phoneColumn] ?? ''
    const phone = normalizePhone(rawPhone)
    const createdAt = parseDate(row[settings.dateColumn] ?? '', settings.dateFormat)
    const source = (row[settings.sourceColumn] ?? '').trim()
    const status = (row[settings.statusColumn] ?? '').trim()
    const inPeriod = Boolean(createdAt && createdAt >= settings.periodStart && createdAt <= settings.periodEnd)
    const rawEmail = (row[settings.emailColumn] ?? '').trim().toLowerCase()
    const disposableEmail = rawEmail.includes('@') && disposable.has(rawEmail.split('@')[1])
    const junk = junkNames.has(name.toLowerCase()) || /^\d+$/.test(name) || name.length <= 1
    const noContact = !phone && !email
    let reasonCode: Lead['reasonCode'] = 'VERIFIED'
    let reason = 'Valid contact, parsed date, and unique within the reporting period.'
    if (!inPeriod) {
      reasonCode = 'OUT_OF_PERIOD'
      reason = createdAt ? `Created on ${createdAt}, outside the reporting period.` : 'Created date could not be parsed.'
    } else if (noContact || disposableEmail || (junk && noContact)) {
      reasonCode = 'INVALID_OR_JUNK'
      reason = disposableEmail ? 'Disposable email domain detected.' : noContact ? 'No valid phone or email contact found.' : 'Junk/test name detected.'
    }
    return { id: `lead-${index + 1}`, original: row, name, phone, email, source, createdAt, status, reasonCode, reason, isReview: isForeignNumber(rawPhone) }
  })

  const eligible = leads.filter((lead) => lead.reasonCode === 'VERIFIED')
  const byKey = new Map<string, Lead[]>()
  eligible.forEach((lead) => {
    ;[lead.phone && `p:${lead.phone}`, lead.email && `e:${lead.email}`].filter(Boolean).forEach((key) => {
      const group = byKey.get(key) ?? []
      group.push(lead)
      byKey.set(key, group)
    })
  })
  const parent = new Map<string, string>()
  const find = (id: string): string => {
    const current = parent.get(id)
    if (!current || current === id) return current ?? id
    const root = find(current)
    parent.set(id, root)
    return root
  }
  const union = (a: string, b: string) => {
    const rootA = find(a)
    const rootB = find(b)
    if (rootA !== rootB) parent.set(rootB, rootA)
  }
  byKey.forEach((group) => group.slice(1).forEach((lead) => union(group[0].id, lead.id)))
  const clusters = new Map<string, Lead[]>()
  eligible.forEach((lead) => {
    const root = find(lead.id)
    const group = clusters.get(root) ?? []
    group.push(lead)
    clusters.set(root, group)
  })
  const duplicateClusters = [...clusters.values()].filter((group) => group.length > 1)
  duplicateClusters.forEach((group) => {
    const survivor = [...group].sort(compareCreated)[0]
    group.forEach((lead) => {
      if (lead.id !== survivor.id) {
        lead.reasonCode = 'DUPLICATE'
        lead.reason = `Matches ${survivor.name} by normalized ${lead.phone ? 'phone' : 'email'}.`
        lead.survivorId = survivor.id
      }
    })
  })
  const reviewQueue = leads.filter((lead) => lead.isReview && lead.reasonCode === 'VERIFIED')
  const total = leads.length
  const outOfPeriod = leads.filter((lead) => lead.reasonCode === 'OUT_OF_PERIOD').length
  const invalidJunk = leads.filter((lead) => lead.reasonCode === 'INVALID_OR_JUNK').length
  const duplicates = leads.filter((lead) => lead.reasonCode === 'DUPLICATE').length
  const verified = leads.filter((lead) => lead.reasonCode === 'VERIFIED').length
  const sourceCoverage = total ? leads.filter((lead) => lead.source).length / total : 0
  const contactCoverage = total ? leads.filter((lead) => lead.phone || lead.email).length / total : 0
  const dateCoverage = total ? leads.filter((lead) => lead.createdAt).length / total : 0
  const reviewResolution = reviewQueue.length ? 0 : 1
  const confidence = Math.round((sourceCoverage * 0.2 + contactCoverage * 0.35 + dateCoverage * 0.25 + reviewResolution * 0.2) * 100)
  return {
    rows: leads,
    duplicateClusters,
    reviewQueue,
    waterfall: { total, platformClaimed: (settings.metaClaimed ?? 0) + (settings.googleClaimed ?? 0), outOfPeriod, invalidJunk, duplicates, verified, gap: (settings.metaClaimed ?? 0) + (settings.googleClaimed ?? 0) - verified },
    confidence: { score: confidence, sourceCoverage, contactCoverage, dateCoverage, reviewResolution },
    quality: { rowCount: total, missingEmails: leads.filter((lead) => !lead.email).length, missingPhones: leads.filter((lead) => !lead.phone).length, unparseableDates: leads.filter((lead) => !lead.createdAt).length },
  }
}
