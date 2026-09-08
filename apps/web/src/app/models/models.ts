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

export interface FichaTecnica {
  id: string;
  nome: string;
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

export interface SensibilidadeVolumeDTO {
  percentualDoVolumeEstimado: number;
  volume: number;
  custoFixoRateadoPorUnidade: MoneyJSON;
}

export interface ResultadoPrecoPorCanalDTO {
  canalId: string;
  canalNome: string;
  precoVenda: MoneyJSON;
  precoVendaFormatado: string;
  lucroLiquidoUnitario: MoneyJSON;
  markupEquivalente: number;
  margemContribuicao: number;
  composicao: ComposicaoPrecoDTO;
  pontoEquilibrio: { unidades: number; faturamento: MoneyJSON } | null;
  sensibilidadeVolume: SensibilidadeVolumeDTO[];
  alertasTributarios: AlertaTributario[];
  alertaMargemMinima: string | null;
  memorial: LinhaMemorial[];
  avisoLegal: string;
}

export interface CalculoPrecoRequest {
  fichaTecnicaId: string;
  canalIds: string[];
  volumeEstimadoMensal: number;
  criterioRateio: 'volume' | 'tempo_producao';
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
  volumeEstimadoMensal: number;
  criterioRateio: 'volume' | 'tempo_producao';
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
