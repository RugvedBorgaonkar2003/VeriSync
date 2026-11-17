import type { RawLead } from '../engine/types'

const names = ['Rahul Sharma', 'Aarav Mehta', 'Priya Iyer', 'Vikram Singh', 'Ananya Rao', 'Neha Kapoor', 'Rohan Desai', 'Kavya Nair', 'Sanjay Patil', 'Ishita Joshi', 'Arjun Malhotra', 'Meera Shah']
const domains = ['gmail.com', 'outlook.com', 'yahoo.in', 'proton.me']
const sources = ['Meta - Lead Form', 'Google - Search']
const businesses = ['Indore Smile Clinic', 'BlueStone Realty', 'Apex IAS Academy']

function random(seed: number) {
  let value = seed
  return () => (value = (value * 9301 + 49297) % 233280) / 233280
}

export function generateSampleLeads(count = 1200): RawLead[] {
  const next = random(20261116)
  const rows: RawLead[] = []
  for (let index = 0; index < count; index += 1) {
    const name = names[Math.floor(next() * names.length)]
    const basePhone = `${6 + Math.floor(next() * 4)}${Math.floor(next() * 1_000_000_000).toString().padStart(9, '0')}`
    const duplicate = index > 0 && index % 8 === 0
    const phone = duplicate ? rows[index - 1].Phone : index % 37 === 0 ? '9999999999' : index % 23 === 0 ? `+91 ${basePhone.slice(0, 5)}-${basePhone.slice(5)}` : `0${basePhone}`
    const email = index % 29 === 0 ? 'rahul@tempmail.com' : duplicate ? rows[index - 1].Email.toUpperCase() : `${name.toLowerCase().replace(' ', '.')}${index}@${domains[Math.floor(next() * domains.length)]}`
    const date = index % 25 === 0 ? `2025-${String(8 + (index % 4)).padStart(2, '0')}-12` : `${String(1 + (index % 28)).padStart(2, '0')}/${String(1 + (index % 3)).padStart(2, '0')}/2026`
    rows.push({ Name: index % 41 === 0 ? 'Test User' : name, Phone: phone, Email: email, Source: `${sources[index % 2]} · ${businesses[index % 3]}`, 'Created Date': date, Status: index % 9 === 0 ? 'Contacted' : 'New' })
  }
  return rows
}
