# Carteira de Clientes Agency

Este repositório contém a infraestrutura do Supabase (schemas, migrations, políticas de RLS e Edge Functions) para o sistema modular de gerenciamento de carteira de clientes da agência.

## Estrutura do Projeto

*   `/supabase`: Configurações, migrations do banco de dados e Edge Functions.
    *   `/migrations`: Scripts SQL estruturados para execução na base de dados.
    *   `/functions`: Edge Functions Deno/TypeScript com padrão Adapter para integrações de ERPs.
