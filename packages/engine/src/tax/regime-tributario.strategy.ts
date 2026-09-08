import { Money } from "../domain/money.js";
import { Percentage } from "../domain/percentage.js";
import { MemorialCalculo } from "../domain/memorial.js";

export interface AlertaTributario {
  nivel: "info" | "atencao" | "critico";
  mensagem: string;
}

export interface ResultadoRegimeTributario {
  /**
   * Percentual de tributos que entra no DENOMINADOR da fórmula de preço
   * (incide sobre o preço de venda). Zero quando o regime cobra valor fixo
   * (MEI) — nesse caso o custo tributário vai para `custoFixoMensalAdicional`.
   */
  percentualSobreVenda: Percentage;
  /** DAS-MEI: valor fixo mensal a somar ao custo fixo rateado, não ao percentual. */
  custoFixoMensalAdicional: Money;
  alertas: AlertaTributario[];
}

export interface RegimeTributarioStrategy {
  readonly nome: string;
  calcular(dataReferencia: Date, memorial: MemorialCalculo): ResultadoRegimeTributario;
}
