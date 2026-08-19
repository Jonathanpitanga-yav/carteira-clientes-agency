async function run() {
  const res = await fetch("https://api.supabase.com/v1/projects/tnbruzzlgissagxsqrge/database/query", {
    method: "POST",
    headers: {"Content-Type":"application/json","Authorization":"Bearer " + process.env.SUPABASE_ACCESS_TOKEN},
    body: JSON.stringify({query: "select email, encrypted_password from auth.users"})
  });
  console.log(await res.text());
}
run();
