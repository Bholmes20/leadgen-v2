import db from '@/lib/db'

export type ContractorMatch = {
  id: string
  name: string
  phone: string
  email: string | null
  priority_rank: number
  rating: number | null
  quotes_from_photos: number
  covered_zips: string[]
}

export function matchContractors(service: string, zip: string | null): ContractorMatch[] {
  type Row = {
    id: string
    name: string
    phone: string
    email: string | null
    priority_rank: number
    rating: number | null
    quotes_from_photos: number
    coverage_zip: string
  }

  const rows: Row[] = zip
    ? (db.prepare(`
        SELECT c.id, c.name, c.phone, c.email, c.priority_rank, c.rating, c.quotes_from_photos,
               cs.coverage_zip
        FROM contractors c
        JOIN contractor_services cs ON cs.contractor_id = c.id
        WHERE c.active = 1 AND cs.service = ? AND cs.coverage_zip = ?
        ORDER BY c.priority_rank ASC, c.name ASC
      `).all(service, zip) as Row[])
    : (db.prepare(`
        SELECT c.id, c.name, c.phone, c.email, c.priority_rank, c.rating, c.quotes_from_photos,
               cs.coverage_zip
        FROM contractors c
        JOIN contractor_services cs ON cs.contractor_id = c.id
        WHERE c.active = 1 AND cs.service = ?
        ORDER BY c.priority_rank ASC, c.name ASC
      `).all(service) as Row[])

  const map = new Map<string, ContractorMatch>()
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        priority_rank: row.priority_rank,
        rating: row.rating,
        quotes_from_photos: row.quotes_from_photos,
        covered_zips: [],
      })
    }
    map.get(row.id)!.covered_zips.push(row.coverage_zip)
  }

  return Array.from(map.values())
}
