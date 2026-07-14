async function run() {
  const res = await fetch("https://api.supabase.com/v1/projects/tnbruzzlgissagxsqrge/database/query", {
    method: "POST",
    headers: {"Content-Type":"application/json","Authorization":"Bearer sbp_f9f6c28433dec03bb120d1ca2411445c7cf68dfe"},
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
