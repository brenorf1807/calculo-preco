import Decimal from "decimal.js";
import { describe, it, expect } from "vitest";
import { Insumo } from "../src/domain/insumo.js";
import { Money } from "../src/domain/money.js";
import { Percentage } from "../src/domain/percentage.js";

describe("Insumo", () => {
  it("calcula custo unitário convertendo unidade de compra para consumo", () => {
    // Compra farinha em pacote de 5kg por R$25, consome em gramas, sem perda.
    const insumo = new Insumo({
      id: "1",
      nome: "Farinha",
      categoria: "materia_prima",
      unidadeCompra: "kg",
      precoCompra: Money.fromReais(25),
      quantidadeEmbalagem: new Decimal(5),
      unidadeConsumo: "g",
      fatorConversao: new Decimal(1000),
      percentualPerda: Percentage.zero(),
    });
    // 25 / 5kg = 5/kg => /1000 = 0,005/g — NÃO arredonda para centavo (fica em Decimal de precisão arbitrária)
    expect(insumo.custoUnitario().toNumber()).toBeCloseTo(0.005, 6);
  });

  it("aumenta custo unitário proporcionalmente à perda técnica", () => {
    const semPerda = new Insumo({
      id: "1",
      nome: "Tecido",
      categoria: "materia_prima",
      unidadeCompra: "m",
      precoCompra: Money.fromReais(100),
      quantidadeEmbalagem: new Decimal(1),
      unidadeConsumo: "m",
      fatorConversao: new Decimal(1),
      percentualPerda: Percentage.zero(),
    });
    const comPerda = new Insumo({
      id: "2",
      nome: "Tecido",
      categoria: "materia_prima",
      unidadeCompra: "m",
      precoCompra: Money.fromReais(100),
      quantidadeEmbalagem: new Decimal(1),
      unidadeConsumo: "m",
      fatorConversao: new Decimal(1),
      percentualPerda: Percentage.fromPercent(5),
    });
    expect(comPerda.custoUnitario().toNumber()).toBeGreaterThan(semPerda.custoUnitario().toNumber());
    // 100 / (1 - 0.05) = 105,263...
    expect(comPerda.custoUnitario().toNumber()).toBeCloseTo(105.263157894, 6);
  });

  it("rejeita percentualPerda >= 100%", () => {
    expect(
      () =>
        new Insumo({
          id: "1",
          nome: "X",
          categoria: "materia_prima",
          unidadeCompra: "kg",
          precoCompra: Money.fromReais(10),
          quantidadeEmbalagem: new Decimal(1),
          unidadeConsumo: "kg",
          fatorConversao: new Decimal(1),
          percentualPerda: Percentage.fromPercent(100),
        }),
    ).toThrow();
  });
});
