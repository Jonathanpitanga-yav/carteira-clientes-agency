const fs = require('fs')
const path = require('path')
const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260720000000_agency_analytics.sql'), 'utf8')
const payload = JSON.stringify({ query: sql })
const tmp = process.env.TEMP || '/tmp'
fs.writeFileSync(path.join(tmp, 'migration.json'), payload)
console.log('Payload generated:', payload.length, 'bytes')
