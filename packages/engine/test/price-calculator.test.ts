import { describe, it, expect } from "vitest";
import {
  calcularPrecoVenda,
  calcularMargemRealDadoPreco,
  calcularPrecoPorCanais,
  PrecoImpossivelError,
} from "../src/pricing/price-calculator.js";
import { Money } from "../src/domain/money.js";
import { Percentage } from "../src/domain/percentage.js";
import { MeiStrategy } from "../src/tax/mei.strategy.js";
import { SimplesNacionalStrategy } from "../src/tax/simples-nacional.strategy.js";
import { InMemoryTaxRuleRepository } from "../src/tax/tax-rule-repository.js";

describe("calcularPrecoVenda — precificação por dentro", () => {
  it("resolve o preço como incógnita, não aplica markup simples sobre o custo", () => {
    // Custo direto 20, custo fixo 10% (percentual sobre faturamento), tributos 6%, variáveis 9%, margem 15% => denominador 0,60
    const resultado = calcularPrecoVenda({
      custoDiretoUnitario: Money.fromReais(20),
      custosFixosPorPedidoUnitario: Money.zero(),
      percentualCustoFixo: Percentage.fromPercent(10),
      percentualTributos: Percentage.fromPercent(6),
      percentualCustosVariaveis: Percentage.fromPercent(9),
      percentualMargemLiquidaDesejada: Percentage.fromPercent(15),
    });
    // 20 / 0.60 = 33,3333... -> R$ 33,33
    expect(resultado.precoVenda.format()).toBe("R$ 33,33");
  });

  it("o lucro líquido resultante corresponde exatamente ao percentual de margem desejado sobre o preço", () => {
    const resultado = calcularPrecoVenda({
      custoDiretoUnitario: Money.fromReais(20),
      custosFixosPorPedidoUnitario: Money.zero(),
      percentualCustoFixo: Percentage.fromPercent(10),
      percentualTributos: Percentage.fromPercent(6),
      percentualCustosVariaveis: Percentage.fromPercent(9),
      percentualMargemLiquidaDesejada: Percentage.fromPercent(15),
    });
    const lucroEsperado = resultado.precoVenda.multiply(0.15);
    expect(resultado.lucroLiquidoUnitario.format()).toBe(lucroEsperado.format());
  });

  it("inclui taxa fixa por pedido no numerador, não no percentual", () => {
    const comTaxaFixa = calcularPrecoVenda({
      custoDiretoUnitario: Money.fromReais(20),
      custosFixosPorPedidoUnitario: Money.fromReais(5),
      percentualCustoFixo: Percentage.zero(),
      percentualTributos: Percentage.zero(),
      percentualCustosVariaveis: Percentage.zero(),
      percentualMargemLiquidaDesejada: Percentage.fromPercent(20),
    });
    // (20 + 5) / 0.8 = 31,25
    expect(comTaxaFixa.precoVenda.format()).toBe("R$ 31,25");
  });

  it("caso de fronteira: soma dos percentuais exatamente 100% é impossível", () => {
    expect(() =>
      calcularPrecoVenda({
        custoDiretoUnitario: Money.fromReais(10),
        custosFixosPorPedidoUnitario: Money.zero(),
        percentualCustoFixo: Percentage.zero(),
        percentualTributos: Percentage.fromPercent(50),
        percentualCustosVariaveis: Percentage.fromPercent(30),
        percentualMargemLiquidaDesejada: Percentage.fromPercent(20),
      }),
    ).toThrow(PrecoImpossivelError);
  });

  it("caso de fronteira: soma dos percentuais acima de 100% é impossível (denominador negativo)", () => {
    expect(() =>
      calcularPrecoVenda({
        custoDiretoUnitario: Money.fromReais(10),
        custosFixosPorPedidoUnitario: Money.zero(),
        percentualCustoFixo: Percentage.zero(),
        percentualTributos: Percentage.fromPercent(60),
        percentualCustosVariaveis: Percentage.fromPercent(30),
        percentualMargemLiquidaDesejada: Percentage.fromPercent(20),
      }),
    ).toThrow(PrecoImpossivelError);
  });

  it("caso de fronteira: soma incluindo custo fixo acima de 100% também é impossível", () => {
    expect(() =>
      calcularPrecoVenda({
        custoDiretoUnitario: Money.fromReais(10),
        custosFixosPorPedidoUnitario: Money.zero(),
        percentualCustoFixo: Percentage.fromPercent(25),
        percentualTributos: Percentage.fromPercent(40),
        percentualCustosVariaveis: Percentage.fromPercent(20),
        percentualMargemLiquidaDesejada: Percentage.fromPercent(20),
      }),
    ).toThrow(PrecoImpossivelError);
  });

  it("caso de fronteira: denominador tendendo a zero gera preço muito alto, nunca infinito/negativo", () => {
    const resultado = calcularPrecoVenda({
      custoDiretoUnitario: Money.fromReais(10),
      custosFixosPorPedidoUnitario: Money.zero(),
      percentualCustoFixo: Percentage.zero(),
      percentualTributos: Percentage.fromPercent(33),
      percentualCustosVariaveis: Percentage.fromPercent(33),
      percentualMargemLiquidaDesejada: Percentage.fromPercent(33.999),
    });
    expect(resultado.precoVenda.isNegative()).toBe(false);
    expect(Number.isFinite(resultado.precoVenda.toNumber())).toBe(true);
    expect(resultado.precoVenda.greaterThan(Money.fromReais(9000))).toBe(true);
  });

  it("markup equivalente e margem de contribuição são coerentes", () => {
    const resultado = calcularPrecoVenda({
      custoDiretoUnitario: Money.fromReais(20),
      custosFixosPorPedidoUnitario: Money.zero(),
      percentualCustoFixo: Percentage.fromPercent(10),
      percentualTributos: Percentage.fromPercent(6),
      percentualCustosVariaveis: Percentage.fromPercent(9),
      percentualMargemLiquidaDesejada: Percentage.fromPercent(15),
    });
    expect(resultado.markupEquivalente.toNumber()).toBeGreaterThan(1);
    expect(resultado.margemContribuicao.toNumber()).toBeGreaterThan(0);
    expect(resultado.margemContribuicao.toNumber()).toBeLessThan(1);
  });

  it("margem de contribuição = %custo fixo + %margem desejada (é o que sobra pra cobrir os dois)", () => {
    // Por definição, margem de contribuição é o que sobra do preço depois só
    // dos custos variáveis — dinheiro que precisa cobrir custo fixo E lucro.
    // Algebricamente: margemContribuicao% = percentualCustoFixo + percentualMargemLiquidaDesejada.
    const resultado = calcularPrecoVenda({
      custoDiretoUnitario: Money.fromReais(20),
      custosFixosPorPedidoUnitario: Money.zero(),
      percentualCustoFixo: Percentage.fromPercent(25),
      percentualTributos: Percentage.fromPercent(6),
      percentualCustosVariaveis: Percentage.fromPercent(9),
      percentualMargemLiquidaDesejada: Percentage.fromPercent(15),
    });
    expect(resultado.margemContribuicao.toNumber()).toBeCloseTo(0.25 + 0.15, 2);
  });
});

describe("calcularMargemRealDadoPreco — engenharia reversa", () => {
  it("calcula a margem líquida real dado um preço de mercado", () => {
    const resultado = calcularMargemRealDadoPreco({
      precoMercado: Money.fromReais(33.33),
      custoDiretoUnitario: Money.fromReais(20),
      custosFixosPorPedidoUnitario: Money.zero(),
      percentualCustoFixo: Percentage.fromPercent(10),
      percentualTributos: Percentage.fromPercent(6),
      percentualCustosVariaveis: Percentage.fromPercent(9),
    });
    // deve bater aproximadamente com os 15% de margem usados no teste direto
    expect(resultado.margemLiquidaReal.toNumber()).toBeCloseTo(0.15, 2);
  });

  it("acusa margem negativa quando o preço de mercado gera prejuízo", () => {
    const resultado = calcularMargemRealDadoPreco({
      precoMercado: Money.fromReais(15),
      custoDiretoUnitario: Money.fromReais(20),
      custosFixosPorPedidoUnitario: Money.zero(),
      percentualCustoFixo: Percentage.fromPercent(10),
      percentualTributos: Percentage.fromPercent(6),
      percentualCustosVariaveis: Percentage.fromPercent(9),
    });
    expect(resultado.margemLiquidaReal.isNegative()).toBe(true);
  });
});

describe("calcularPrecoPorCanais — mesma ficha técnica, preços diferentes por canal", () => {
  const repo = new InMemoryTaxRuleRepository();
  const data = new Date("2026-06-01");

  it("MEI vende mais barato no canal com menos taxas", () => {
    const regime = new MeiStrategy({ valorDasMeiMensal: Money.fromReais(76.9), faturamentoAcumulado12Meses: Money.fromReais(40_000) }, repo);
    const resultados = calcularPrecoPorCanais([
      {
        canalId: "loja",
        canalNome: "Loja própria",
        regime,
        dataReferencia: data,
        custoDiretoUnitario: Money.fromReais(20),
        percentualCustoFixo: Percentage.fromPercent(10),
        percentualCustosVariaveisCanal: Percentage.fromPercent(2),
        custosFixosPorPedidoCanal: Money.zero(),
        percentualMargemLiquidaDesejada: Percentage.fromPercent(15),
      },
      {
        canalId: "marketplace",
        canalNome: "Marketplace",
        regime,
        dataReferencia: data,
        custoDiretoUnitario: Money.fromReais(20),
        percentualCustoFixo: Percentage.fromPercent(10),
        percentualCustosVariaveisCanal: Percentage.fromPercent(18),
        custosFixosPorPedidoCanal: Money.fromReais(5),
        percentualMargemLiquidaDesejada: Percentage.fromPercent(15),
      },
    ]);

    const loja = resultados.find((r) => r.canalId === "loja")!;
    const marketplace = resultados.find((r) => r.canalId === "marketplace")!;
    expect(marketplace.resultado.precoVenda.greaterThan(loja.resultado.precoVenda)).toBe(true);
  });

  it("Simples Nacional embute a alíquota efetiva no denominador de cada canal", () => {
    const regime = new SimplesNacionalStrategy({ anexo: "I", rbt12: Money.fromReais(200_000) }, repo);
    const [resultado] = calcularPrecoPorCanais([
      {
        canalId: "loja",
        canalNome: "Loja própria",
        regime,
        dataReferencia: data,
        custoDiretoUnitario: Money.fromReais(20),
        percentualCustoFixo: Percentage.fromPercent(10),
        percentualCustosVariaveisCanal: Percentage.fromPercent(2),
        custosFixosPorPedidoCanal: Money.zero(),
        percentualMargemLiquidaDesejada: Percentage.fromPercent(15),
      },
    ]);
    expect(resultado!.resultado.alertasTributarios).toBeDefined();
    expect(resultado!.resultado.precoVenda.greaterThan(Money.zero())).toBe(true);
  });
});
