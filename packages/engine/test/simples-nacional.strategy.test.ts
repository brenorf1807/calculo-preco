import { describe, it, expect } from "vitest";
import { SimplesNacionalStrategy } from "../src/tax/simples-nacional.strategy.js";
import { InMemoryTaxRuleRepository } from "../src/tax/tax-rule-repository.js";
import { MemorialCalculo } from "../src/domain/memorial.js";
import { Money } from "../src/domain/money.js";

const repo = new InMemoryTaxRuleRepository();
const data = new Date("2026-06-01");

describe("SimplesNacionalStrategy", () => {
  it("calcula alíquota efetiva na 1ª faixa do Anexo I", () => {
    // RBT12 = 100.000 -> 1ª faixa, aliquota nominal 4%, sem parcela a deduzir
    const strategy = new SimplesNacionalStrategy({ anexo: "I", rbt12: Money.fromReais(100_000) }, repo);
    const resultado = strategy.calcular(data, new MemorialCalculo());
    expect(resultado.percentualSobreVenda.toDisplayString()).toBe("4.00%");
  });

  it("calcula alíquota efetiva na 2ª faixa do Anexo I com parcela a deduzir", () => {
    // RBT12 = 200.000 -> ((200000*0.073) - 5940) / 200000 = 0,0433 = 4,33%
    const strategy = new SimplesNacionalStrategy({ anexo: "I", rbt12: Money.fromReais(200_000) }, repo);
    const resultado = strategy.calcular(data, new MemorialCalculo());
    expect(resultado.percentualSobreVenda.toDisplayString()).toBe("4.33%");
  });

  it("caso de fronteira: RBT12 exatamente no teto da 1ª faixa usa a 1ª faixa", () => {
    const strategy = new SimplesNacionalStrategy({ anexo: "I", rbt12: Money.fromReais(180_000) }, repo);
    const resultado = strategy.calcular(data, new MemorialCalculo());
    expect(resultado.percentualSobreVenda.toDisplayString()).toBe("4.00%");
  });

  it("caso de fronteira: 1 centavo acima do teto já usa a 2ª faixa (efeito degrau)", () => {
    const strategy = new SimplesNacionalStrategy({ anexo: "I", rbt12: Money.fromReais(180_000.01) }, repo);
    const resultado = strategy.calcular(data, new MemorialCalculo());
    const primeiraFaixa = new SimplesNacionalStrategy({ anexo: "I", rbt12: Money.fromReais(180_000) }, repo).calcular(
      data,
      new MemorialCalculo(),
    );
    expect(resultado.percentualSobreVenda.toNumber()).not.toBe(primeiraFaixa.percentualSobreVenda.toNumber());
  });

  it("alerta quando RBT12 está a 90%+ do teto da faixa (efeito degrau iminente)", () => {
    const strategy = new SimplesNacionalStrategy({ anexo: "I", rbt12: Money.fromReais(165_000) }, repo);
    const resultado = strategy.calcular(data, new MemorialCalculo());
    expect(resultado.alertas.some((a) => a.nivel === "atencao")).toBe(true);
  });

  it("empresa nova (RBT12 = 0) usa alíquota nominal da 1ª faixa como aproximação e sinaliza alerta", () => {
    const strategy = new SimplesNacionalStrategy({ anexo: "III", rbt12: Money.zero() }, repo);
    const resultado = strategy.calcular(data, new MemorialCalculo());
    expect(resultado.percentualSobreVenda.toDisplayString()).toBe("6.00%");
    expect(resultado.alertas.some((a) => a.nivel === "atencao")).toBe(true);
  });

  it("lança erro explicativo quando RBT12 excede o teto do Simples Nacional", () => {
    const strategy = new SimplesNacionalStrategy({ anexo: "I", rbt12: Money.fromReais(5_000_000) }, repo);
    expect(() => strategy.calcular(data, new MemorialCalculo())).toThrow(/Lucro Presumido/);
  });

  it("Anexo III tem alíquota efetiva diferente do Anexo I na mesma faixa de receita", () => {
    const anexoI = new SimplesNacionalStrategy({ anexo: "I", rbt12: Money.fromReais(100_000) }, repo).calcular(data, new MemorialCalculo());
    const anexoIII = new SimplesNacionalStrategy({ anexo: "III", rbt12: Money.fromReais(100_000) }, repo).calcular(data, new MemorialCalculo());
    expect(anexoI.percentualSobreVenda.toNumber()).not.toBe(anexoIII.percentualSobreVenda.toNumber());
  });
});
