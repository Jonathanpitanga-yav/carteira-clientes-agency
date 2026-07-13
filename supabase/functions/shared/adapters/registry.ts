import { IERPAdapter } from "./base.ts";
import { BlingAdapter } from "./bling.ts";
import { TinyAdapter } from "./tiny.ts";

const adapters: Record<string, IERPAdapter> = {
  bling: new BlingAdapter(),
  tiny: new TinyAdapter(),
};

export function getAdapter(providerName: string): IERPAdapter {
  const adapter = adapters[providerName.toLowerCase()];
  if (!adapter) {
    throw new Error(`Nenhum adaptador configurado para o provedor: ${providerName}`);
  }
  return adapter;
}
