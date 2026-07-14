async function run() {
  const res = await fetch("https://api.supabase.com/v1/projects/tnbruzzlgissagxsqrge/database/query", {
    method: "POST",
    headers: {"Content-Type": "application/json", "Authorization": "Bearer sbp_f9f6c28433dec03bb120d1ca2411445c7cf68dfe"},
    body: JSON.stringify({query: "select column_name, data_type from information_schema.columns where table_schema = 'core' and table_name = 'profiles' and column_name in ('role','roles')"})
  });
  console.log(await res.text());
}
run();
