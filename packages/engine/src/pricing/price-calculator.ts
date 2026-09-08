import { Decimal } from "decimal.js";
import { Money } from "../domain/money.js";
import { Percentage } from "../domain/percentage.js";
import { MemorialCalculo, LinhaMemorial } from "../domain/memorial.js";
import { RegimeTributarioStrategy } from "../tax/regime-tributario.strategy.js";
import { AlertaTributario } from "../tax/regime-tributario.strategy.js";

export class PrecoImpossivelError extends Error {
  constructor(somaPercentuais: Percentage) {
    super(
      `Preço matematicamente impossível: a soma de tributos + custos variáveis + margem desejada é ${somaPercentuais.toDisplayString()}, que é ≥ 100%. Reduza a margem desejada ou os custos percentuais, ou revise o regime tributário.`,
    );
    this.name = "PrecoImpossivelError";
  }
}

export interface PriceCalculatorInput {
  custoDiretoUnitario: Money;
  custoFixoRateadoUnitario: Money;
  /** Taxas fixas por pedido do canal (ex.: R$5/venda no marketplace) — vão para o numerador, nunca para o percentual. */
  custosFixosPorPedidoUnitario: Money;
  percentualTributos: Percentage;
  percentualCustosVariaveis: Percentage;
  percentualMargemLiquidaDesejada: Percentage;
  alertasTributarios?: AlertaTributario[];
}

export interface ResultadoPrecificacao {
  precoVenda: Money;
  custoDiretoTotalUnitario: Money;
  lucroLiquidoUnitario: Money;
  markupEquivalente: Decimal;
  margemContribuicao: Percentage;
  margemContribuicaoValorUnitario: Money;
  alertasTributarios: AlertaTributario[];
  memorial: LinhaMemorial[];
}

/**
 * Preço de Venda = (Custo Direto + Custo Fixo Rateado + Taxas Fixas/Pedido)
 *                  ÷ (1 − %Tributos − %Custos Variáveis − %Margem Líquida)
 *
 * Os percentuais do denominador incidem sobre o PREÇO DE VENDA (precificação
 * "por dentro"), nunca sobre o custo — esse é o ponto que calculadoras que
 * usam markup simples erram.
 */
export function calcularPrecoVenda(input: PriceCalculatorInput): ResultadoPrecificacao {
  const memorial = new MemorialCalculo();

  const custoDiretoTotalUnitario = input.custoDiretoUnitario
    .add(input.custoFixoRateadoUnitario)
    .add(input.custosFixosPorPedidoUnitario);

  memorial.registrar({
    descricao: "Numerador: custo direto + custo fixo rateado + taxas fixas por pedido",
    formula: `${input.custoDiretoUnitario.format()} + ${input.custoFixoRateadoUnitario.format()} + ${input.custosFixosPorPedidoUnitario.format()}`,
    valor: custoDiretoTotalUnitario.format(),
  });

  const somaPercentuais = input.percentualTributos
    .add(input.percentualCustosVariaveis)
    .add(input.percentualMargemLiquidaDesejada);

  memorial.registrar({
    descricao: "Soma dos percentuais do denominador (tributos + custos variáveis + margem desejada)",
    formula: `${input.percentualTributos.toDisplayString()} + ${input.percentualCustosVariaveis.toDisplayString()} + ${input.percentualMargemLiquidaDesejada.toDisplayString()}`,
    valor: somaPercentuais.toDisplayString(),
  });

  if (somaPercentuais.toFraction().gte(1)) {
    throw new PrecoImpossivelError(somaPercentuais);
  }

  const fatorDenominador = new Decimal(1).sub(somaPercentuais.toFraction());
  const precoVenda = custoDiretoTotalUnitario.divide(fatorDenominador);

  memorial.registrar({
    descricao: "Preço de venda = numerador ÷ (1 − soma dos percentuais)",
    formula: `${custoDiretoTotalUnitario.format()} ÷ (1 − ${somaPercentuais.toDisplayString()})`,
    valor: precoVenda.format(),
  });

  const lucroLiquidoUnitario = precoVenda.multiply(input.percentualMargemLiquidaDesejada.toFraction());
  const markupEquivalente = custoDiretoTotalUnitario.isZero()
    ? new Decimal(0)
    : precoVenda.toDecimal().div(custoDiretoTotalUnitario.toDecimal());

  const margemContribuicaoValorUnitario = precoVenda
    .subtract(input.custoDiretoUnitario)
    .subtract(input.custosFixosPorPedidoUnitario)
    .subtract(precoVenda.multiply(input.percentualTributos.add(input.percentualCustosVariaveis).toFraction()));

  const margemContribuicao = precoVenda.isZero()
    ? Percentage.zero()
    : Percentage.fromFraction(margemContribuicaoValorUnitario.toDecimal().div(precoVenda.toDecimal()));

  memorial.registrar({
    descricao: "Markup equivalente (preço ÷ custo direto total) e margem de contribuição, para fins didáticos",
    valor: `markup ${markupEquivalente.toFixed(2)}x — margem de contribuição ${margemContribuicao.toDisplayString()}`,
  });

  return {
    precoVenda,
    custoDiretoTotalUnitario,
    lucroLiquidoUnitario,
    markupEquivalente,
    margemContribuicao,
    margemContribuicaoValorUnitario,
    alertasTributarios: input.alertasTributarios ?? [],
    memorial: memorial.toArray(),
  };
}

export interface EngenhariaReversaInput {
  precoMercado: Money;
  custoDiretoUnitario: Money;
  custoFixoRateadoUnitario: Money;
  custosFixosPorPedidoUnitario: Money;
  percentualTributos: Percentage;
  percentualCustosVariaveis: Percentage;
}

export interface ResultadoEngenhariaReversa {
  margemLiquidaReal: Percentage;
  lucroLiquidoUnitario: Money;
  memorial: LinhaMemorial[];
}

/**
 * Modo inverso: dado um preço já praticado no mercado, qual a margem
 * líquida real resultante depois de todos os custos e tributos?
 *
 * margemLiquidaReal = 1 − %Tributos − %CustosVariáveis − (CustoDireto ÷ Preço)
 */
export function calcularMargemRealDadoPreco(input: EngenhariaReversaInput): ResultadoEngenhariaReversa {
  const memorial = new MemorialCalculo();

  if (input.precoMercado.isZero() || input.precoMercado.isNegative()) {
    throw new Error("Preço de mercado deve ser > 0 para engenharia reversa.");
  }

  const custoDiretoTotal = input.custoDiretoUnitario.add(input.custosFixosPorPedidoUnitario);
  const custoFixoSobrePreco = input.custoFixoRateadoUnitario.toDecimal().div(input.precoMercado.toDecimal());
  const custoDiretoSobrePreco = custoDiretoTotal.toDecimal().div(input.precoMercado.toDecimal());

  const margemLiquidaRealFracao = new Decimal(1)
    .sub(input.percentualTributos.toFraction())
    .sub(input.percentualCustosVariaveis.toFraction())
    .sub(custoDiretoSobrePreco)
    .sub(custoFixoSobrePreco);

  const margemLiquidaReal = Percentage.fromFraction(margemLiquidaRealFracao);
  const lucroLiquidoUnitario = input.precoMercado.multiply(margemLiquidaRealFracao);

  memorial.registrar({
    descricao: "Engenharia reversa: margem líquida real dado um preço de mercado",
    formula: `1 − %Tributos − %CustosVariáveis − (CustoDireto+CustoFixo) ÷ Preço`,
    valor: margemLiquidaReal.toDisplayString(),
  });

  if (margemLiquidaReal.isNegative()) {
    memorial.registrar({
      descricao: "ALERTA: margem líquida real é NEGATIVA — este preço gera prejuízo",
      valor: margemLiquidaReal.toDisplayString(),
    });
  }

  return { margemLiquidaReal, lucroLiquidoUnitario, memorial: memorial.toArray() };
}

export interface PrecoPorCanalInput {
  canalId: string;
  canalNome: string;
  regime: RegimeTributarioStrategy;
  dataReferencia: Date;
  custoDiretoUnitario: Money;
  custoFixoRateadoUnitario: Money;
  percentualCustosVariaveisCanal: Percentage;
  custosFixosPorPedidoCanal: Money;
  percentualMargemLiquidaDesejada: Percentage;
}

export interface ResultadoPrecoPorCanal {
  canalId: string;
  canalNome: string;
  resultado: ResultadoPrecificacao;
}

/**
 * Conveniência do Módulo 3: calcula o preço da mesma ficha técnica para
 * múltiplos canais de venda, cada um com seu próprio conjunto de taxas.
 *
 * IMPORTANTE sobre o MEI: `input.custoFixoRateadoUnitario` já deve incluir a
 * cota-parte do DAS-MEI (o chamador inclui o DAS-MEI como uma DespesaFixa em
 * `CustoFixoMensal` ANTES de fazer o rateio — ver Módulo 2). O campo
 * `resultadoRegime.custoFixoMensalAdicional` retornado pela strategy é
 * apenas informativo/auditável aqui; somá-lo de novo duplicaria o custo.
 */
export function calcularPrecoPorCanais(inputs: PrecoPorCanalInput[]): ResultadoPrecoPorCanal[] {
  return inputs.map((input) => {
    const memorial = new MemorialCalculo();
    const resultadoRegime = input.regime.calcular(input.dataReferencia, memorial);

    const resultado = calcularPrecoVenda({
      custoDiretoUnitario: input.custoDiretoUnitario,
      custoFixoRateadoUnitario: input.custoFixoRateadoUnitario,
      custosFixosPorPedidoUnitario: input.custosFixosPorPedidoCanal,
      percentualTributos: resultadoRegime.percentualSobreVenda,
      percentualCustosVariaveis: input.percentualCustosVariaveisCanal,
      percentualMargemLiquidaDesejada: input.percentualMargemLiquidaDesejada,
      alertasTributarios: resultadoRegime.alertas,
    });

    resultado.memorial = [...memorial.toArray(), ...resultado.memorial];

    return { canalId: input.canalId, canalNome: input.canalNome, resultado };
  });
}
