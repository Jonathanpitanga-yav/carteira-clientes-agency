async function run() {
  // Get client IDs and user IDs
  const clients = await fetch("https://api.supabase.com/v1/projects/tnbruzzlgissagxsqrge/database/query", {
    method: "POST",
    headers: {"Content-Type":"application/json","Authorization":"Bearer " + process.env.SUPABASE_ACCESS_TOKEN},
    body: JSON.stringify({query: "select id, name from core.clients where status = 'active' limit 5"})
  });
  const clientsData = await clients.json();
  console.log("Active clients:", clientsData);

  // Try inserting a test link via REST API (simulating frontend)
  // Use a direct SQL insert to test RLS bypasses
  const insertTest = await fetch("https://api.supabase.com/v1/projects/tnbruzzlgissagxsqrge/database/query", {
    method: "POST",
    headers: {"Content-Type":"application/json","Authorization":"Bearer " + process.env.SUPABASE_ACCESS_TOKEN},
    body: JSON.stringify({query: `
      insert into core.client_analysts (analyst_id, client_id)
      select p.id, c.id from core.profiles p, core.clients c
      where p.full_name = 'Jonathan Pitanga' and c.name = 'Yav teste'
      on conflict (analyst_id, client_id) do nothing
      returning id
    `})
  });
  const insertResult = await insertTest.text();
  console.log("Insert result:", insertTest.status, insertResult);
}
run();
