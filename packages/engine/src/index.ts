export { Money } from "./domain/money.js";
export { Percentage } from "./domain/percentage.js";
export { MemorialCalculo } from "./domain/memorial.js";
export type { LinhaMemorial } from "./domain/memorial.js";

export { Insumo } from "./domain/insumo.js";
export type { InsumoProps, UnidadeMedida, HistoricoPreco } from "./domain/insumo.js";

export { FichaTecnica } from "./domain/ficha-tecnica.js";
export type { FichaTecnicaProps, ItemFicha } from "./domain/ficha-tecnica.js";

export { calcularCustoHoraDerivado, calcularCustoMaoDeObraPorUnidade } from "./domain/mao-de-obra.js";
export type { CustoHoraDerivadoInput } from "./domain/mao-de-obra.js";

export { CustoFixoMensal, analiseSensibilidadeVolume, calcularPontoEquilibrio } from "./domain/custo-fixo.js";
export type {
  DespesaFixa,
  CriterioRateio,
  ProdutoParaRateioPorTempo,
  SensibilidadeVolumeResultado,
  PontoEquilibrio,
} from "./domain/custo-fixo.js";

export { CanalVenda } from "./domain/canal-venda.js";
export type { CanalVendaProps, TaxaPercentual, TaxaFixaPorPedido } from "./domain/canal-venda.js";

export { estaVigente, encontrarVigente } from "./tax/vigencia.js";
export type { RegraVigente } from "./tax/vigencia.js";

export {
  TABELA_SIMPLES_ANEXO_I,
  TABELA_SIMPLES_ANEXO_III,
} from "./tax/simples-nacional-tabelas.js";
export type { AnexoSimples, FaixaSimplesNacional } from "./tax/simples-nacional-tabelas.js";

export { LIMITE_FATURAMENTO_MEI, PERCENTUAL_ALERTA_PROXIMIDADE_LIMITE_MEI } from "./tax/mei-tabelas.js";
export type { LimiteFaturamentoMei } from "./tax/mei-tabelas.js";

export { InMemoryTaxRuleRepository } from "./tax/tax-rule-repository.js";
export type { TaxRuleRepository } from "./tax/tax-rule-repository.js";

export type { RegimeTributarioStrategy, ResultadoRegimeTributario, AlertaTributario } from "./tax/regime-tributario.strategy.js";
export { MeiStrategy } from "./tax/mei.strategy.js";
export type { MeiStrategyInput } from "./tax/mei.strategy.js";
export { SimplesNacionalStrategy } from "./tax/simples-nacional.strategy.js";
export type { SimplesNacionalStrategyInput } from "./tax/simples-nacional.strategy.js";

export {
  calcularPrecoVenda,
  calcularMargemRealDadoPreco,
  calcularPrecoPorCanais,
  PrecoImpossivelError,
} from "./pricing/price-calculator.js";
export type {
  PriceCalculatorInput,
  ResultadoPrecificacao,
  EngenhariaReversaInput,
  ResultadoEngenhariaReversa,
  PrecoPorCanalInput,
  ResultadoPrecoPorCanal,
} from "./pricing/price-calculator.js";
