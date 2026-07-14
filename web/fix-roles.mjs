async function run() {
  const sql = "update core.profiles set roles = array[role] where roles is null or array_length(roles, 1) is null;";
  const res = await fetch("https://api.supabase.com/v1/projects/tnbruzzlgissagxsqrge/database/query", {
    method: "POST",
    headers: {"Content-Type":"application/json","Authorization":"Bearer sbp_f9f6c28433dec03bb120d1ca2411445c7cf68dfe"},
    body: JSON.stringify({query: sql})
  });
  console.log("status:", res.status, await res.text());
}
run();
