import { InMemoryRepository } from "./repository.js";
import { InsumoRecord, FichaTecnicaRecord, DespesaFixaRecord, CanalVendaRecord, EmpresaRecord } from "../records/types.js";

/**
 * Collections futuras no Firestore: "insumos", "fichasTecnicas",
 * "despesasFixas", "canaisVenda", "empresa/config" (documento único).
 * MVP é single-tenant (uma empresa por instância) — multi-tenant fica para
 * quando a autenticação do Firebase entrar.
 */
export const insumoRepository = new InMemoryRepository<InsumoRecord>();
export const fichaTecnicaRepository = new InMemoryRepository<FichaTecnicaRecord>();
export const despesaFixaRepository = new InMemoryRepository<DespesaFixaRecord>();
export const canalVendaRepository = new InMemoryRepository<CanalVendaRecord>();

class EmpresaStore {
  private empresa: EmpresaRecord | null = null;

  get(): EmpresaRecord | null {
    return this.empresa;
  }

  set(empresa: EmpresaRecord): EmpresaRecord {
    this.empresa = empresa;
    return empresa;
  }
}

export const empresaStore = new EmpresaStore();
