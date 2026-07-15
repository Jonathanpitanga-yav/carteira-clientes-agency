const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const TOKEN = 'vca_315CRibr8SbNlSFh5PdSq0X1aaEyVml6ROADFs5QVwqF94MpSz0CKJUe'

async function main() {
  // 1. Create project under personal account
  console.log('Creating project...')
  const createCmd = `curl.exe -s -X POST "https://api.vercel.com/v1/projects" -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" -d "{\\\"name\\\":\\\"seller-wallet-preview\\\",\\\"framework\\\":\\\"nextjs\\\",\\\"rootDirectory\\\":\\\"web\\\",\\\"buildCommand\\\":\\\"next build\\\",\\\"outputDirectory\\\":\\\".next\\\",\\\"installCommand\\\":\\\"npm install\\\"}"`
  const createResult = execSync(createCmd).toString()
  console.log('Create result:', createResult)

  // 2. Link local to new project
  console.log('\nLinking to new project...')
  execSync('vercel link --project seller-wallet-preview --yes', { cwd: path.join(__dirname, '..') })

  // 3. Deploy
  console.log('\nDeploying...')
  execSync('vercel deploy --yes', { cwd: path.join(__dirname, '..'), stdio: 'inherit' })
}

main().catch(console.error)
