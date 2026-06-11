import pg from 'pg'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

export const pool = new pg.Pool({
  host:     process.env.POSTGRES_HOST || 'postgres',
  port:     parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB   || 'ezlaunch',
  user:     process.env.POSTGRES_USER  || 'ezl',
  password: process.env.POSTGRES_PASSWORD,
})

export async function runMigrations(dirs) {
  for (const dir of [].concat(dirs)) {
    let entries
    try { entries = await readdir(dir) } catch { continue }
    for (const file of entries.filter(f => f.endsWith('.sql')).sort()) {
      const sql = await readFile(join(dir, file), 'utf8')
      await pool.query(sql)
    }
  }
}
