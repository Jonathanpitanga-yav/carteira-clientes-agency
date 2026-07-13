import { getAdapter } from "../shared/adapters/registry.ts";

Deno.serve(async (req) => {
  // Configurar CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // Contém o app_id para associar a aplicação do cliente

  if (!code || !state) {
    return new Response(JSON.stringify({ error: "Faltando parâmetros code ou state na requisição." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // NOTA: Em produção, buscaríamos a aplicação ('state' mapeia para o 'app_id') 
    // no banco de dados para recuperar as credenciais de autenticação (ex: client_id, client_secret).
    // Abaixo está a simulação estrutural da chamada ao adaptador.
    
    const mockProviderName = "bling"; // seria resolvido dinamicamente via banco
    const adapter = getAdapter(mockProviderName);

    // Simulando obtenção de credenciais
    const credentials = {
      clientId: "mock-client-id",
      clientSecret: "mock-client-secret",
    };

    const tokenResponse = await adapter.exchangeCodeForToken(code, url.origin + url.pathname, credentials);

    // NOTA: Aqui salvaríamos tokenResponse no banco de dados na tabela 'integration.tokens'.

    return new Response(
      JSON.stringify({
        success: true,
        message: `Integração com ${adapter.name} configurada com sucesso.`,
        data: {
          expiresIn: tokenResponse.expiresIn,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erro desconhecido durante o callback de autenticação.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
