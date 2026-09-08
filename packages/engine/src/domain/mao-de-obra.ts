import { Decimal } from "decimal.js";
import { Money } from "./money.js";

/**
 * Horas produtivas ≠ horas trabalhadas: descontar tempo de venda, entrega,
 * atendimento e administrativo do total de horas do mês.
 */
export interface CustoHoraDerivadoInput {
  proLaboreDesejadoMensal: Money;
  encargosMensais: Money;
  horasProdutivasMensais: Decimal;
}

/**
 * Retorna Decimal (reais/hora, precisão arbitrária): dividir um pró-labore
 * por dezenas ou centenas de horas produtivas facilmente cai em frações de
 * centavo — o mesmo cuidado de arredondamento tardio do custo de insumos
 * (ver `Insumo.custoUnitario()`).
 */
export function calcularCustoHoraDerivado(input: CustoHoraDerivadoInput): Decimal {
  if (input.horasProdutivasMensais.lte(0)) {
    throw new Error("horasProdutivasMensais deve ser > 0.");
  }
  return input.proLaboreDesejadoMensal.add(input.encargosMensais).toDecimal().div(input.horasProdutivasMensais);
}

export function calcularCustoMaoDeObraPorUnidade(custoHora: Decimal, tempoProducaoMinutosPorUnidade: Decimal): Decimal {
  return custoHora.mul(tempoProducaoMinutosPorUnidade.div(60));
}
