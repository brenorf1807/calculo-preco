import { describe, it, expect } from "vitest";
import { MeiStrategy } from "../src/tax/mei.strategy.js";
import { InMemoryTaxRuleRepository } from "../src/tax/tax-rule-repository.js";
import { MemorialCalculo } from "../src/domain/memorial.js";
import { Money } from "../src/domain/money.js";

const repo = new InMemoryTaxRuleRepository();
const data = new Date("2026-06-01");

describe("MeiStrategy", () => {
  it("nunca gera percentual sobre venda — DAS é custo fixo", () => {
    const strategy = new MeiStrategy({ valorDasMeiMensal: Money.fromReais(76.9), faturamentoAcumulado12Meses: Money.fromReais(40_000) }, repo);
    const resultado = strategy.calcular(data, new MemorialCalculo());
    expect(resultado.percentualSobreVenda.toNumber()).toBe(0);
    expect(resultado.custoFixoMensalAdicional.format()).toBe("R$ 76,90");
    expect(resultado.alertas).toHaveLength(0);
  });

  it("alerta quando faturamento se aproxima do limite anual (>= 80%)", () => {
    const strategy = new MeiStrategy({ valorDasMeiMensal: Money.fromReais(76.9), faturamentoAcumulado12Meses: Money.fromReais(70_000) }, repo);
    const resultado = strategy.calcular(data, new MemorialCalculo());
    expect(resultado.alertas.some((a) => a.nivel === "atencao")).toBe(true);
  });

  it("alerta crítico quando faturamento ultrapassa o limite anual do MEI", () => {
    const strategy = new MeiStrategy({ valorDasMeiMensal: Money.fromReais(76.9), faturamentoAcumulado12Meses: Money.fromReais(82_000) }, repo);
    const resultado = strategy.calcular(data, new MemorialCalculo());
    expect(resultado.alertas.some((a) => a.nivel === "critico")).toBe(true);
  });

  it("caso de fronteira: faturamento exatamente no limite não dispara alerta crítico", () => {
    const strategy = new MeiStrategy({ valorDasMeiMensal: Money.fromReais(76.9), faturamentoAcumulado12Meses: Money.fromReais(81_000) }, repo);
    const resultado = strategy.calcular(data, new MemorialCalculo());
    expect(resultado.alertas.some((a) => a.nivel === "critico")).toBe(false);
  });
});
