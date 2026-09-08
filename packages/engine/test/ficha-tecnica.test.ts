import Decimal from "decimal.js";
import { describe, it, expect } from "vitest";
import { FichaTecnica } from "../src/domain/ficha-tecnica.js";
import { Insumo } from "../src/domain/insumo.js";
import { Money } from "../src/domain/money.js";
import { Percentage } from "../src/domain/percentage.js";

function insumoSimples(id: string, precoReais: number): Insumo {
  return new Insumo({
    id,
    nome: id,
    categoria: "materia_prima",
    unidadeCompra: "unidade",
    precoCompra: Money.fromReais(precoReais),
    quantidadeEmbalagem: new Decimal(1),
    unidadeConsumo: "unidade",
    fatorConversao: new Decimal(1),
    percentualPerda: Percentage.zero(),
  });
}

describe("FichaTecnica", () => {
  it("calcula custo total e por unidade considerando o rendimento", () => {
    const insumos = new Map([
      ["farinha", insumoSimples("farinha", 10)],
      ["acucar", insumoSimples("acucar", 4)],
    ]);
    const ficha = new FichaTecnica({
      id: "bolo",
      nome: "Bolo de cenoura",
      itens: [
        { insumoId: "farinha", quantidade: new Decimal(2) },
        { insumoId: "acucar", quantidade: new Decimal(1) },
      ],
      rendimento: new Decimal(12),
      tempoProducaoMinutos: new Decimal(60),
    });

    expect(ficha.custoTotalInsumos(insumos).toNumber()).toBe(24);
    expect(ficha.custoInsumosPorUnidade(insumos).toNumber()).toBe(2);
    expect(ficha.tempoProducaoPorUnidadeMinutos().toNumber()).toBe(5);
  });

  it("NÃO perde custo de insumos fracionários de centavo (arredondamento tardio)", () => {
    // Farinha a R$6,50/5kg custa R$0,0013/g — bem abaixo de 1 centavo.
    // Uma implementação que arredondasse a cada item zeraria esse custo.
    const farinha = new Insumo({
      id: "farinha",
      nome: "Farinha",
      categoria: "materia_prima",
      unidadeCompra: "kg",
      precoCompra: Money.fromReais(6.5),
      quantidadeEmbalagem: new Decimal(5),
      unidadeConsumo: "g",
      fatorConversao: new Decimal(1000),
      percentualPerda: Percentage.zero(),
    });
    const ficha = new FichaTecnica({
      id: "bolo",
      nome: "Bolo de pote",
      itens: [{ insumoId: "farinha", quantidade: new Decimal(3000) }],
      rendimento: new Decimal(24),
      tempoProducaoMinutos: new Decimal(90),
    });
    const custoTotal = ficha.custoTotalInsumos(new Map([["farinha", farinha]]));
    // 3000g * R$0,0013/g = R$3,90 — nada de zero aqui.
    expect(custoTotal.toNumber()).toBeCloseTo(3.9, 6);
    expect(custoTotal.toNumber()).toBeGreaterThan(0);
  });

  it("lança erro se insumo referenciado não existir", () => {
    const ficha = new FichaTecnica({
      id: "x",
      nome: "x",
      itens: [{ insumoId: "inexistente", quantidade: new Decimal(1) }],
      rendimento: new Decimal(1),
      tempoProducaoMinutos: new Decimal(1),
    });
    expect(() => ficha.custoTotalInsumos(new Map())).toThrow();
  });

  it("rejeita rendimento <= 0", () => {
    expect(
      () =>
        new FichaTecnica({
          id: "x",
          nome: "x",
          itens: [{ insumoId: "a", quantidade: new Decimal(1) }],
          rendimento: new Decimal(0),
          tempoProducaoMinutos: new Decimal(1),
        }),
    ).toThrow();
  });
});
