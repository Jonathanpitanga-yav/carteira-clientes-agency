const anon =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuYnJ1enpsZ2lzc2FneHNxcmdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMxMDcsImV4cCI6MjA5OTUwOTEwN30.0lgTITQ5xnbvHKxJ0zmVxThKX9Ij7d4CbVsD4wZvQhg";
const url = "https://tnbruzzlgissagxsqrge.supabase.co/functions/v1/erp-retranslate-invoices";

(async () => {
  let offset = 0;
  const limit = 300;
  let totalUpdated = 0;

  while (true) {
    const body = JSON.stringify({ limit, offset });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${anon}`,
        apikey: anon,
        "Content-Type": "application/json",
      },
      body,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Batch failed", offset, res.status, text.slice(0, 300));
      process.exit(1);
    }
    if (!res.ok) {
      console.error("Batch failed", offset, res.status, data);
      process.exit(1);
    }
    totalUpdated += data.updated || 0;
    console.log(
      `offset=${offset} updated=${data.updated} total=${data.total} hasMore=${data.hasMore}`
    );
    if (!data.hasMore || !data.total) break;
    offset += limit;
  }

  console.log(`DONE totalUpdated=${totalUpdated}`);
})();
