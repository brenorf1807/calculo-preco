export interface HistoricoPreco {
  data: string;
  precoCompraReais: number;
}

export interface Insumo {
  id: string;
  nome: string;
  categoria: 'materia_prima' | 'embalagem';
  unidadeCompra: string;
  precoCompraReais: number;
  quantidadeEmbalagem: number;
  unidadeConsumo: string;
  fatorConversao: number;
  percentualPerda: number;
  fornecedorId?: string;
  historicoPrecos: HistoricoPreco[];
}

export interface ItemFicha {
  insumoId: string;
  quantidade: number;
}

export type TipoProduto = 'receita' | 'revenda';

export interface FichaTecnica {
  id: string;
  nome: string;
  /**
   * 'receita' = combina N insumos (indústria/produção própria).
   * 'revenda' = compra um produto pronto e revende (ex.: açougue que
   * compra carne e revende no balcão) — sempre 1 único insumo e
   * rendimento 1; a perda no corte/porcionamento já é modelada no
   * `percentualPerda` do próprio insumo, não precisa de "receita".
   * Ausente em documentos antigos → tratar como 'receita'.
   */
  tipo?: TipoProduto;
  itens: ItemFicha[];
  rendimento: number;
  tempoProducaoMinutos: number;
}

export interface DespesaFixa {
  id: string;
  nome: string;
  categoria: string;
  valorMensalReais: number;
}

export interface TaxaPercentual {
  nome: string;
  percentual: number;
}

export interface TaxaFixaPorPedido {
  nome: string;
  valorReais: number;
}

export interface CanalVenda {
  id: string;
  nome: string;
  taxasPercentuais: TaxaPercentual[];
  taxasFixasPorPedido: TaxaFixaPorPedido[];
}

export type RegimeTributario = 'MEI' | 'SIMPLES_NACIONAL';
export type AnexoSimples = 'I' | 'III';

export interface Empresa {
  regimeTributario: RegimeTributario;
  anexoSimples?: AnexoSimples;
  rbt12Reais?: number;
  dasMeiValorMensalReais?: number;
  faturamentoAcumulado12MesesReais?: number;
  margemLiquidaMinimaAlertaPercent?: number;
  /**
   * Faturamento mensal estimado da empresa toda (não de um produto). Usado
   * para transformar o total de custos fixos num percentual único, aplicado
   * automaticamente em todo cálculo de preço — evita ratear por volume de
   * cada item (que exige informar volume toda vez e, se feito produto a
   * produto, soma o custo fixo inteiro várias vezes).
   */
  faturamentoMensalEstimadoReais?: number;
}

export interface MoneyJSON {
  reais: number;
  cents: string;
}

export interface AlertaTributario {
  nivel: 'info' | 'atencao' | 'critico';
  mensagem: string;
}

export interface LinhaMemorial {
  ordem: number;
  descricao: string;
  formula?: string;
  valor?: string;
  regraAplicada?: string;
  fonte?: string;
}

export interface ComposicaoPrecoDTO {
  materiaPrima: number;
  embalagem: number;
  maoDeObra: number;
  custoFixoRateado: number;
  taxasFixasPorPedido: number;
  tributos: number;
  custosVariaveisCanal: number;
  lucroLiquido: number;
}

export interface ResultadoPrecoPorCanalDTO {
  canalId: string;
  canalNome: string;
  precoVenda: MoneyJSON;
  precoVendaFormatado: string;
  lucroLiquidoUnitario: MoneyJSON;
  markupEquivalente: number;
  margemContribuicao: number;
  percentualCustoFixoAplicado: number;
  composicao: ComposicaoPrecoDTO;
  pontoEquilibrio: { unidades: number; faturamento: MoneyJSON } | null;
  alertasTributarios: AlertaTributario[];
  alertaMargemMinima: string | null;
  memorial: LinhaMemorial[];
  avisoLegal: string;
}

export interface CalculoPrecoRequest {
  /** Informe exatamente um dos dois: fichaTecnicaId (produto salvo) OU insumoId (revenda rápida, sem salvar ficha). */
  fichaTecnicaId?: string;
  /** Revenda rápida: precifica um insumo diretamente, sem precisar cadastrar uma ficha técnica pra ele. */
  insumoId?: string;
  /** Só usado com insumoId. Quantidade do insumo (na unidade de consumo dele) vendida por unidade — default 1. */
  quantidadePorUnidade?: number;
  canalIds: string[];
  percentualMargemLiquidaDesejada: number;
  custoMaoDeObra?: {
    modo: 'manual' | 'derivado';
    custoHoraReais?: number;
    proLaboreDesejadoMensalReais?: number;
    encargosMensaisReais?: number;
    horasProdutivasMensais?: number;
  };
  dataReferencia?: string;
}

export interface EngenhariaReversaRequest {
  fichaTecnicaId: string;
  canalId: string;
  precoMercado: number;
  dataReferencia?: string;
}

export interface EngenhariaReversaResultado {
  margemLiquidaReal: number;
  margemLiquidaRealFormatada: string;
  lucroLiquidoUnitario: MoneyJSON;
  prejuizo: boolean;
  memorial: LinhaMemorial[];
  avisoLegal: string;
}

export interface ApiErro {
  erro: string;
  tipo?: string;
  detalheAdicional?: string;
  detalhes?: unknown;
}
