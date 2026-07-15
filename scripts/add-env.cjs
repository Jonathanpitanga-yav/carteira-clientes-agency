const { execSync } = require('child_process')

const TOKEN = 'vca_315CRibr8SbNlSFh5PdSq0X1aaEyVml6ROADFs5QVwqF94MpSz0CKJUe'
const TEAM = 'team_P9jFCMFaIck9hLOy5lj9EiE9'
const PROJ = 'prj_4AazhJ1DkZxg81RsrUkRUj0E95N4'

const payload = JSON.stringify([
  { type: 'encrypted', key: 'NEXT_PUBLIC_SUPABASE_URL', value: 'https://tnbruzzlgissagxsqrge.supabase.co', target: ['production', 'preview', 'development'] },
  { type: 'encrypted', key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuYnJ1enpsZ2lzc2FneHNxcmdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMxMDcsImV4cCI6MjA5OTUwOTEwN30.0lgTITQ5xnbvHKxJ0zmVxThKX9Ij7d4CbVsD4wZvQhg', target: ['production', 'preview', 'development'] },
])

const cmd = `curl.exe -s -X POST "https://api.vercel.com/v1/projects/${PROJ}/env?teamId=${TEAM}" -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" -d "${payload.replace(/"/g, '\\"')}"`

console.log('Adding env vars...')
const result = execSync(cmd, { shell: 'cmd.exe' }).toString()
console.log('Result:', result)
