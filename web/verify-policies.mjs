async function run() {
  const res = await fetch("https://api.supabase.com/v1/projects/tnbruzzlgissagxsqrge/database/query", {
    method: "POST",
    headers: {"Content-Type":"application/json","Authorization":"Bearer " + process.env.SUPABASE_ACCESS_TOKEN},
    body: JSON.stringify({query: `
      select schemaname, tablename, policyname, cmd
      from pg_policies
      where tablename in ('client_analysts', 'client_users')
      order by tablename, policyname
    `})
  });
  console.log(await res.text());
}
run();
