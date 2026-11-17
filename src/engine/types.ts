export type ReasonCode = 'OUT_OF_PERIOD' | 'INVALID_OR_JUNK' | 'DUPLICATE' | 'VERIFIED'

export type RawLead = Record<string, string>

export type Lead = {
  id: string
  original: RawLead
  name: string
  phone: string
  email: string
  source: string
  createdAt: string
  status: string
  reasonCode: ReasonCode
  reason: string
  survivorId?: string
  isReview: boolean
  reviewResolved?: 'merge' | 'keep'
}

export type CleaningSettings = {
  nameColumn: string
  phoneColumn: string
  emailColumn: string
  sourceColumn: string
  dateColumn: string
  statusColumn: string
  dateFormat: 'DMY' | 'MDY'
  periodStart: string
  periodEnd: string
  metaClaimed?: number
  googleClaimed?: number
}

export type Waterfall = {
  total: number
  platformClaimed: number
  outOfPeriod: number
  invalidJunk: number
  duplicates: number
  verified: number
  gap: number
}

export type CleanResult = {
  rows: Lead[]
  duplicateClusters: Lead[][]
  reviewQueue: Lead[]
  waterfall: Waterfall
  confidence: {
    score: number
    sourceCoverage: number
    contactCoverage: number
    dateCoverage: number
    reviewResolution: number
  }
  quality: {
    rowCount: number
    missingEmails: number
    missingPhones: number
    unparseableDates: number
  }
}
