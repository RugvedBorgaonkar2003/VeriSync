import { cleanLeads } from '../engine/clean'
self.onmessage = (event: MessageEvent) => {
  const { rows, settings } = event.data
  self.postMessage({ type: 'progress', value: 18 })
  const result = cleanLeads(rows, settings)
  self.postMessage({ type: 'progress', value: 100 })
  self.postMessage({ type: 'complete', result })
}
