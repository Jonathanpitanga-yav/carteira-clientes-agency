async function run() {
  const res = await fetch("https://api.supabase.com/v1/projects/tnbruzzlgissagxsqrge/database/query", {
    method: "POST",
    headers: {"Content-Type": "application/json", "Authorization": "Bearer " + process.env.SUPABASE_ACCESS_TOKEN},
    body: JSON.stringify({query: "select count(*) as total, count(*) filter (where roles is null or array_length(roles,1) is null) as empty_roles from core.profiles"})
  });
  console.log(await res.text());
}
run();
