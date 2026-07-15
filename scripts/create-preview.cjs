const { execSync } = require('child_process')
const path = require('path')

const TOKEN = 'vca_315CRibr8SbNlSFh5PdSq0X1aaEyVml6ROADFs5QVwqF94MpSz0CKJUe'
const TEAM = 'team_P9jFCMFaIck9hLOy5lj9EiE9'
const root = path.join(__dirname, '..')

function api(method, urlPath, body) {
  const cmd = `curl.exe -s -X ${method} "https://api.vercel.com${urlPath}?teamId=${TEAM}" -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" -d '${JSON.stringify(body).replace(/'/g, "'\\''")}'`
  return JSON.parse(execSync(cmd, { shell: 'cmd.exe', cwd: root }).toString())
}

// 1. Create project
const proj = api('POST', '/v1/projects', {
  name: 'sw-preview3',
  framework: 'nextjs',
  rootDirectory: 'web',
  buildCommand: 'next build',
  outputDirectory: '.next',
  installCommand: 'npm install',
  ssoProtection: null,
})
console.log('Created project:', proj.name, proj.id, proj.alias?.[0]?.domain)

// 2. Add env vars
const envResult = api('POST', `/v1/projects/${proj.id}/env`, [
  { type: 'encrypted', key: 'NEXT_PUBLIC_SUPABASE_URL', value: 'https://tnbruzzlgissagxsqrge.supabase.co', target: ['production', 'preview', 'development'] },
  { type: 'encrypted', key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuYnJ1enpsZ2lzc2FneHNxcmdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMxMDcsImV4cCI6MjA5OTUwOTEwN30.0lgTITQ5xnbvHKxJ0zmVxThKX9Ij7d4CbVsD4wZvQhg', target: ['production', 'preview', 'development'] },
])
console.log('Env vars added:', envResult.length, 'vars')

// 3. Link and deploy
execSync('vercel link --project sw-preview3 --yes', { cwd: root, shell: 'cmd.exe' })
const deploy = execSync('vercel deploy --yes', { cwd: root, shell: 'cmd.exe' }).toString()
console.log('Deploy result:', deploy)
