async function run() {
  const res = await fetch("https://api.supabase.com/v1/projects/tnbruzzlgissagxsqrge/database/query", {
    method: "POST",
    headers: {"Content-Type": "application/json", "Authorization": "Bearer sbp_f9f6c28433dec03bb120d1ca2411445c7cf68dfe"},
    body: JSON.stringify({query: "select count(*) as total, count(*) filter (where roles is null or array_length(roles,1) is null) as empty_roles from core.profiles"})
  });
  console.log(await res.text());
}
run();
