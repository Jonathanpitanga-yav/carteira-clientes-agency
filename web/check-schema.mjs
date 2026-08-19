async function run() {
  const res = await fetch("https://api.supabase.com/v1/projects/tnbruzzlgissagxsqrge/database/query", {
    method: "POST",
    headers: {"Content-Type": "application/json", "Authorization": "Bearer " + process.env.SUPABASE_ACCESS_TOKEN},
    body: JSON.stringify({query: "select column_name, data_type from information_schema.columns where table_schema = 'core' and table_name = 'profiles' and column_name in ('role','roles')"})
  });
  console.log(await res.text());
}
run();
