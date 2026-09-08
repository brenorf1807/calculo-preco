import { Decimal } from "decimal.js";

/**
 * Percentual representado como fração (0 a 1), com precisão alta mantida
 * durante toda a cadeia de cálculo. Só é arredondado no momento de exibição
 * (`toDisplayString`), nunca antes — arredondar percentuais cedo demais é
 * uma das formas mais comuns de distorcer o preço final.
 */
export class Percentage {
  private readonly fraction: Decimal;

  private constructor(fraction: Decimal) {
    this.fraction = fraction;
  }

  static zero(): Percentage {
    return new Percentage(new Decimal(0));
  }

  static fromFraction(value: number | string | Decimal): Percentage {
    return new Percentage(new Decimal(value));
  }

  /** Ex.: Percentage.fromPercent(4.5) representa 4,5% => fração 0.045 */
  static fromPercent(value: number | string | Decimal): Percentage {
    return new Percentage(new Decimal(value).div(100));
  }

  toFraction(): Decimal {
    return this.fraction;
  }

  add(other: Percentage): Percentage {
    return new Percentage(this.fraction.add(other.fraction));
  }

  subtract(other: Percentage): Percentage {
    return new Percentage(this.fraction.sub(other.fraction));
  }

  isNegative(): boolean {
    return this.fraction.isNegative();
  }

  greaterThanOrEqual(other: Percentage): boolean {
    return this.fraction.gte(other.fraction);
  }

  toDisplayString(casas = 2): string {
    return `${this.fraction.mul(100).toDecimalPlaces(casas, Decimal.ROUND_HALF_UP).toFixed(casas)}%`;
  }

  toNumber(): number {
    return this.fraction.toNumber();
  }
}
