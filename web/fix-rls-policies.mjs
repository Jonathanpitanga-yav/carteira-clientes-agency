async function run() {
  const sql = `
    create policy "admins e leaders gerenciam client_analysts" on core.client_analysts
      for all using (core.get_my_role() in ('admin', 'leader'));

    create policy "leitura de vinculos de analistas" on core.client_analysts
      for select using (core.get_my_role() in ('admin', 'leader') or analyst_id = auth.uid());
  `;
  const res = await fetch("https://api.supabase.com/v1/projects/tnbruzzlgissagxsqrge/database/query", {
    method: "POST",
    headers: {"Content-Type":"application/json","Authorization":"Bearer sbp_f9f6c28433dec03bb120d1ca2411445c7cf68dfe"},
    body: JSON.stringify({query: sql})
  });
  console.log("status:", res.status, await res.text());
}
run();
