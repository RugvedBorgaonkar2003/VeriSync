# VeriSync lead reconciliation prototype

An India-focused, front-end-only prototype for turning a CRM export into one defensible number: **verified unique leads**.

## Run locally

```bash
npm install
npm run dev
```

The sample workspace is deterministic and contains realistic CRM data with mixed Indian phone formats, duplicate records, invalid contacts, disposable emails, and out-of-period dates. Processing happens in a browser Web Worker; files are never uploaded.

## Useful commands

```bash
npm run build
npm run test
```

## Demo flow

Load the sample CSV, run reconciliation, click any waterfall bar to inspect its evidence, then open Duplicate clusters or Flagged leads. The CSV export is generated locally from the current result.

The prototype intentionally focuses on the complete hero flow before adding external CRM integrations or a server.
