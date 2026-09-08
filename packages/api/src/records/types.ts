/**
 * "Records" são o formato de persistência (JSON puro, sem classes de
 * domínio) — de propósito: é exatamente o formato de documento que o
 * Firestore vai guardar quando a integração for plugada (cada Repository
 * abaixo diz explicitamente qual seria a collection correspondente). Nada
 * na camada HTTP depende de como os dados são guardados hoje.
 */

export interface InsumoRecord {
  id: string;
  nome: string;
  categoria: "materia_prima" | "embalagem";
  unidadeCompra: string;
  precoCompraReais: number;
  quantidadeEmbalagem: number;
  unidadeConsumo: string;
  fatorConversao: number;
  percentualPerda: number; // 0-100
  fornecedorId?: string;
  historicoPrecos: { data: string; precoCompraReais: number }[];
}

export interface ItemFichaRecord {
  insumoId: string;
  quantidade: number;
}

export interface FichaTecnicaRecord {
  id: string;
  nome: string;
  itens: ItemFichaRecord[];
  rendimento: number;
  tempoProducaoMinutos: number;
}

export interface DespesaFixaRecord {
  id: string;
  nome: string;
  categoria: string;
  valorMensalReais: number;
}

export interface TaxaPercentualRecord {
  nome: string;
  percentual: number; // 0-100
}

export interface TaxaFixaPorPedidoRecord {
  nome: string;
  valorReais: number;
}

export interface CanalVendaRecord {
  id: string;
  nome: string;
  taxasPercentuais: TaxaPercentualRecord[];
  taxasFixasPorPedido: TaxaFixaPorPedidoRecord[];
}

export type RegimeTributarioTipo = "MEI" | "SIMPLES_NACIONAL";
export type AnexoSimplesTipo = "I" | "III";

export interface EmpresaRecord {
  regimeTributario: RegimeTributarioTipo;
  anexoSimples?: AnexoSimplesTipo;
  rbt12Reais?: number;
  dasMeiValorMensalReais?: number;
  faturamentoAcumulado12MesesReais?: number;
  margemLiquidaMinimaAlertaPercent?: number;
}
