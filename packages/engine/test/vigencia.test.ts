import { describe, it, expect } from "vitest";
import { estaVigente, encontrarVigente, RegraVigente } from "../src/tax/vigencia.js";
import { SimplesNacionalStrategy } from "../src/tax/simples-nacional.strategy.js";
import { InMemoryTaxRuleRepository } from "../src/tax/tax-rule-repository.js";
import { MemorialCalculo } from "../src/domain/memorial.js";
import { Money } from "../src/domain/money.js";

describe("vigencia (regras versionadas por data)", () => {
  const regraAntiga: RegraVigente = { vigenciaInicio: new Date("2018-01-01"), vigenciaFim: new Date("2025-12-31"), fonte: "x" };
  const regraAtual: RegraVigente = { vigenciaInicio: new Date("2026-01-01"), vigenciaFim: null, fonte: "y" };

  it("seleciona a regra vigente na data de referência, não a mais recente cadastrada", () => {
    const vigentesEm2020 = encontrarVigente([regraAntiga, regraAtual], new Date("2020-06-01"));
    expect(vigentesEm2020).toEqual([regraAntiga]);

    const vigentesEm2027 = encontrarVigente([regraAntiga, regraAtual], new Date("2027-06-01"));
    expect(vigentesEm2027).toEqual([regraAtual]);
  });

  it("regra sem vigenciaFim continua vigente indefinidamente", () => {
    expect(estaVigente(regraAtual, new Date("2033-01-01"))).toBe(true);
  });

  it("regra fora da janela de vigência não é retornada", () => {
    expect(estaVigente(regraAntiga, new Date("2026-01-01"))).toBe(false);
  });
});

describe("regressão de vigência — mesmo produto calculado em datas diferentes (2026, 2027, 2033)", () => {
  const repo = new InMemoryTaxRuleRepository();
  const rbt12 = Money.fromReais(100_000);

  it.each([new Date("2026-06-01"), new Date("2027-06-01"), new Date("2033-06-01")])(
    "aplica a tabela do Anexo I vigente em %s sem quebrar o cálculo",
    (data) => {
      const strategy = new SimplesNacionalStrategy({ anexo: "I", rbt12 }, repo);
      const resultado = strategy.calcular(data, new MemorialCalculo());
      expect(resultado.percentualSobreVenda.toNumber()).toBeGreaterThan(0);
    },
  );
});
