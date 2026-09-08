import { Decimal } from "decimal.js";

/**
 * Dinheiro nunca é ponto flutuante. Internamente guardamos centavos como
 * inteiro (BigInt) e só usamos Decimal para as contas intermediárias
 * (percentuais, rateios). Toda conversão de volta para dinheiro passa por
 * `roundToCents`, que é o único ponto de arredondamento monetário do
 * sistema — política HALF_UP, 2 casas decimais.
 */
Decimal.set({ rounding: Decimal.ROUND_HALF_UP, precision: 40 });

export class Money {
  private readonly cents: bigint;

  private constructor(cents: bigint) {
    this.cents = cents;
  }

  static zero(): Money {
    return new Money(0n);
  }

  static fromCents(cents: number | bigint): Money {
    return new Money(BigInt(cents));
  }

  static fromReais(value: number | string | Decimal): Money {
    const d = new Decimal(value).mul(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
    return new Money(BigInt(d.toFixed(0)));
  }

  toDecimal(): Decimal {
    return new Decimal(this.cents.toString()).div(100);
  }

  toCentsNumber(): number {
    return Number(this.cents);
  }

  toNumber(): number {
    return this.toDecimal().toNumber();
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    return new Money(this.cents - other.cents);
  }

  /** Multiplica por um fator adimensional (Decimal|number), arredondando HALF_UP em centavos. */
  multiply(factor: Decimal | number): Money {
    const d = new Decimal(this.cents.toString()).mul(factor);
    return new Money(BigInt(d.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(0)));
  }

  /** Divide por um divisor adimensional (Decimal|number), arredondando HALF_UP em centavos. */
  divide(divisor: Decimal | number): Money {
    const divisorD = new Decimal(divisor);
    if (divisorD.isZero()) {
      throw new Error("Divisão por zero ao operar valor monetário.");
    }
    const d = new Decimal(this.cents.toString()).div(divisorD);
    return new Money(BigInt(d.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(0)));
  }

  isNegative(): boolean {
    return this.cents < 0n;
  }

  isZero(): boolean {
    return this.cents === 0n;
  }

  compareTo(other: Money): -1 | 0 | 1 {
    if (this.cents < other.cents) return -1;
    if (this.cents > other.cents) return 1;
    return 0;
  }

  lessThan(other: Money): boolean {
    return this.compareTo(other) < 0;
  }

  greaterThan(other: Money): boolean {
    return this.compareTo(other) > 0;
  }

  /** Formata em Real brasileiro, ex.: "R$ 1.234,56" (espaço normal, não NBSP). */
  format(): string {
    return this.toDecimal()
      .toNumber()
      .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      .replace(/ /g, " ");
  }

  toJSON(): { reais: number; cents: string } {
    return { reais: this.toNumber(), cents: this.cents.toString() };
  }
}
