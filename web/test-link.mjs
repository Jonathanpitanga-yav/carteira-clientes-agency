async function run() {
  // Test: insert a client_analyst link using the anon key (simulating frontend)
  const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuYnJ1enpsZ2lzc2FneHNxcmdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMxMDcsImV4cCI6MjA5OTUwOTEwN30.0lgTITQ5xnbvHKxJ0zmVxThKX9Ij7d4CbVsD4wZvQhg";
  const token = "eyJhbGciOiJFUzI1NiIsImtpZCI6ImNmZDM0MmQ5LTE2NmYtNGY0Yy1hN2E0LWYzY2ZhZDUxMjQ1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3RuYnJ1enpsZ2lzc2FneHNxcmdlLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIxMTRhYzJkOS0yYzllLTQ1ODctYmVlOS04ZmZkOGFjMzZiNGIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzg0MDM4NjEzLCJpYXQiOjE3ODQwMzUwMTMsImVtYWlsIjoiam9uYXRoYW4ucGl0YW5nYUB5YXYuY29tLmJyIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6ImpvbmF0aGFuLnBpdGFuZ2FAeWF2LmNvbS5iciIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiIxMTRhYzJkOS0yYzllLTQ1ODctYmVlOS04ZmZkOGFjMzZiNGIifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc4NDAzNTAxM31dLCJzZXNzaW9uX2lkIjoiMjBmNGVkMDUtZTMyYS00YmFiLWI4ZTYtYzA4Y2FmNjMxYTNlIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.dRJ30yEs7ADzitAD61bwlrksaMfeai_ew_GxPxG28e8uH7ue25JzKMgfNj3Q906-PDqVZ7su7kUHoCYKIMxBPw";

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
