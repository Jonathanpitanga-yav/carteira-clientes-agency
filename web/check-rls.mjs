async function run() {
  const res = await fetch("https://api.supabase.com/v1/projects/tnbruzzlgissagxsqrge/database/query", {
    method: "POST",
    headers: {"Content-Type":"application/json","Authorization":"Bearer " + process.env.SUPABASE_ACCESS_TOKEN},
    body: JSON.stringify({query: `
      select schemaname, tablename, policyname, permissive, roles, cmd, qual
      from pg_policies
      where tablename = 'client_analysts'
      order by tablename, policyname
    `})
  });
  console.log(await res.text());
}
run();
