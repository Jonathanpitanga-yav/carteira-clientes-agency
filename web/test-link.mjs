async function run() {
  // Test: insert a client_analyst link using the anon key (simulating frontend)
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const token = process.env.SUPABASE_SESSION_TOKEN;

  // First check existing clients and users
  const clientsRes = await fetch("https://tnbruzzlgissagxsqrge.supabase.co/rest/v1/clients?select=id,name&status=eq.active", {
    headers: {"apikey": anonKey, "Authorization": `Bearer ${token}`}
  });
  const clients = await clientsRes.json();
  console.log("Clients:", clients);

  const usersRes = await fetch("https://tnbruzzlgissagxsqrge.supabase.co/rest/v1/profiles?select=id,full_name,role", {
    headers: {"apikey": anonKey, "Authorization": `Bearer ${token}`}
  });
  // Need to use core schema
  const usersRes2 = await fetch("https://tnbruzzlgissagxsqrge.supabase.co/rest/v1/profiles?select=id,full_name,role", {
    headers: {
      "apikey": anonKey,
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
      "Content-Type": "application/json"
    }
  });
  const users = await usersRes2.json();
  console.log("Users:", users);
}
run();
