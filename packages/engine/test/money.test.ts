import { describe, it, expect } from "vitest";
import { Money } from "../src/domain/money.js";

describe("Money", () => {
  it("nunca usa ponto flutuante — soma centavos exatos", () => {
    const a = Money.fromReais(0.1);
    const b = Money.fromReais(0.2);
    expect(a.add(b).format()).toBe("R$ 0,30");
  });

  it("arredonda HALF_UP ao dividir", () => {
    const total = Money.fromReais(10);
    const porTres = total.divide(3);
    expect(porTres.toCentsNumber()).toBe(333);
  });

  it("arredonda 0,5 centavo para cima (HALF_UP)", () => {
    const m = Money.fromReais(1).divide(200);
    expect(m.toCentsNumber()).toBe(1);
  });

  it("rejeita divisão por zero", () => {
    expect(() => Money.fromReais(10).divide(0)).toThrow();
  });
});
