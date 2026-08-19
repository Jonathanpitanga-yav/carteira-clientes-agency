async function run() {
  const res = await fetch("https://api.supabase.com/v1/projects/tnbruzzlgissagxsqrge/database/query", {
    method: "POST",
    headers: {"Content-Type":"application/json","Authorization":"Bearer " + process.env.SUPABASE_ACCESS_TOKEN},
    body: JSON.stringify({query: `
      select schemaname, tablename, rowsecurity from pg_tables
      where tablename in ('client_analysts', 'client_users', 'profiles', 'clients')
      and schemaname = 'core'
      order by tablename
    `})
  });
  console.log(await res.text());
}
run();
