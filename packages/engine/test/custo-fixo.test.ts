import Decimal from "decimal.js";
import { describe, it, expect } from "vitest";
import { CustoFixoMensal, analiseSensibilidadeVolume, calcularPontoEquilibrio } from "../src/domain/custo-fixo.js";
import { Money } from "../src/domain/money.js";

describe("CustoFixoMensal", () => {
  const custoFixo = new CustoFixoMensal([
    { id: "1", nome: "Aluguel", categoria: "infra", valorMensal: Money.fromReais(1000) },
    { id: "2", nome: "Internet", categoria: "infra", valorMensal: Money.fromReais(100) },
  ]);

  it("soma o total mensal", () => {
    expect(custoFixo.totalMensal().format()).toBe("R$ 1.100,00");
  });

  it("rateia por volume simples", () => {
    expect(custoFixo.rateioPorVolume(new Decimal(100)).format()).toBe("R$ 11,00");
  });

  it("a armadilha do rateio: volume menor eleva o custo fixo unitário", () => {
    const resultado = analiseSensibilidadeVolume(custoFixo, new Decimal(100));
    const [setenta, cem, centoETrinta] = resultado;
    expect(setenta!.custoFixoRateadoPorUnidade.greaterThan(cem!.custoFixoRateadoPorUnidade)).toBe(true);
    expect(cem!.custoFixoRateadoPorUnidade.greaterThan(centoETrinta!.custoFixoRateadoPorUnidade)).toBe(true);
  });

  it("rateia por tempo de produção proporcionalmente à complexidade", () => {
    const resultado = custoFixo.rateioPorTempoProducao([
      { produtoId: "simples", tempoProducaoMinutosPorUnidade: new Decimal(5), volumeEstimadoMensal: new Decimal(100) },
      { produtoId: "complexo", tempoProducaoMinutosPorUnidade: new Decimal(45), volumeEstimadoMensal: new Decimal(100) },
    ]);
    // produto complexo consome 9x mais tempo por unidade -> recebe proporcionalmente mais custo fixo por unidade
    expect(resultado.get("complexo")!.greaterThan(resultado.get("simples")!)).toBe(true);
  });

  it("rejeita rateio com volume <= 0", () => {
    expect(() => custoFixo.rateioPorVolume(new Decimal(0))).toThrow();
  });

  it("calcula o percentual de custo fixo sobre o faturamento mensal estimado", () => {
    // 1.100 de custo fixo / 11.000 de faturamento estimado = 10%
    expect(custoFixo.percentualSobreFaturamento(Money.fromReais(11_000)).toDisplayString()).toBe("10.00%");
  });

  it("rejeita percentual sobre faturamento <= 0", () => {
    expect(() => custoFixo.percentualSobreFaturamento(Money.zero())).toThrow();
  });
});

describe("calcularPontoEquilibrio", () => {
  it("calcula unidades e faturamento de equilíbrio", () => {
    const resultado = calcularPontoEquilibrio(Money.fromReais(1100), Money.fromReais(11), Money.fromReais(50));
    expect(resultado.unidades.toNumber()).toBe(100);
    expect(resultado.faturamento.format()).toBe("R$ 5.000,00");
  });

  it("rejeita margem de contribuição unitária não positiva", () => {
    expect(() => calcularPontoEquilibrio(Money.fromReais(1100), Money.zero(), Money.fromReais(50))).toThrow();
  });
});
