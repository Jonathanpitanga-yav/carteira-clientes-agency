const fs = require('fs')
const path = require('path')
const tmp = process.env.TEMP || '/tmp'

const queries = [
  "SELECT count(*)::int AS n FROM sales.agency_portfolio_overview",
  "SELECT count(*)::int AS n FROM sales.agency_client_concentration",
  "SELECT count(*)::int AS n FROM sales.agency_erp_distribution",
  "SELECT count(*)::int AS n FROM sales.agency_channel_benchmarks",
]

async function main() {
  for (const query of queries) {
    const name = query.split('FROM ')[1].trim().replace(' AS n', '')
    fs.writeFileSync(path.join(tmp, 'check.json'), JSON.stringify({ query }))
    console.log(`Checking ${name}...`)
  }
}

main()
