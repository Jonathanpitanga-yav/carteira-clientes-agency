import type { ERPOrder } from "./adapters/base.ts";

/** Payload da listagem Bling/Tiny costuma vir incompleto (sem transporte, itens, intermediador). */
export function orderNeedsDetailFetch(order: {
  items?: unknown[];
  rawPayload?: Record<string, unknown> | null;
}): boolean {
  const raw = order.rawPayload;
  if (!raw || typeof raw !== "object") return true;
  if (!raw.transporte && (raw.numeroLoja || raw.loja)) return true;
  if ((order.items?.length ?? 0) === 0) return true;
  return false;
}

export async function enrichOrderWithDetail(
  adapter: { fetchOrderById?: (token: string, id: string) => Promise<ERPOrder> },
  accessToken: string | undefined,
  order: ERPOrder,
): Promise<ERPOrder> {
  if (!accessToken || !adapter.fetchOrderById || !order.externalId) return order;
  if (!orderNeedsDetailFetch(order)) return order;

  try {
    return await adapter.fetchOrderById(accessToken, order.externalId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Erro ao buscar detalhes do pedido ${order.externalId}: ${message}`);
    return order;
  }
}
