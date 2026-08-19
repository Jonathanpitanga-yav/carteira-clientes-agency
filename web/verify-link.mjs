async function run() {
  // Verify the link exists
  const res = await fetch("https://api.supabase.com/v1/projects/tnbruzzlgissagxsqrge/database/query", {
    method: "POST",
    headers: {"Content-Type":"application/json","Authorization":"Bearer " + process.env.SUPABASE_ACCESS_TOKEN},
    body: JSON.stringify({query: `
      select ca.id, p.full_name as analyst, c.name as client
      from core.client_analysts ca
      join core.profiles p on p.id = ca.analyst_id
      join core.clients c on c.id = ca.client_id
    `})
  });
  console.log(await res.text());
}
run();
