# Cleaning engine contract

`cleanLeads(rows, settings)` is a pure deterministic function. It accepts and returns JSON-serializable values only, so it can later be exposed by a `POST /clean` FastAPI endpoint without changing the domain model.

## Input

```ts
type RawLead = Record<string, string>

type CleaningSettings = {
  nameColumn: string
  phoneColumn: string
  emailColumn: string
  sourceColumn: string
  dateColumn: string
  statusColumn: string
  dateFormat: 'DMY' | 'MDY'
  periodStart: string // YYYY-MM-DD
  periodEnd: string   // YYYY-MM-DD
  metaClaimed?: number
  googleClaimed?: number
}
```

## Output

The result contains normalized `rows`, duplicate clusters, a review queue, a transparent confidence breakdown, quality counters, and a waterfall. Every row receives exactly one `reasonCode`: `OUT_OF_PERIOD`, `INVALID_OR_JUNK`, `DUPLICATE`, or `VERIFIED`.

The invariant is:

```text
total = outOfPeriod + invalidJunk + duplicates + verified
```

The engine never deletes rows. Duplicate survivors are the earliest parsed record and duplicate rows contain `survivorId`. Foreign-looking numbers remain visible in the review queue instead of being silently discarded.
