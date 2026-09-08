import { Money } from "./money.js";
import { Percentage } from "./percentage.js";

/**
 * Taxas percentuais incidem sobre o preço de venda e entram no denominador
 * da fórmula "por dentro". Taxas fixas por pedido (ex.: R$ 5 por venda no
 * marketplace) NÃO são percentuais — entram no numerador como custo direto.
 * Nunca misturar os dois.
 */
export interface TaxaPercentual {
  nome: string;
  percentual: Percentage;
}

export interface TaxaFixaPorPedido {
  nome: string;
  valor: Money;
}

export interface CanalVendaProps {
  id: string;
  nome: string;
  taxasPercentuais: TaxaPercentual[];
  taxasFixasPorPedido?: TaxaFixaPorPedido[];
}

export class CanalVenda {
  readonly id: string;
  readonly nome: string;
  readonly taxasPercentuais: TaxaPercentual[];
  readonly taxasFixasPorPedido: TaxaFixaPorPedido[];

  constructor(props: CanalVendaProps) {
    this.id = props.id;
    this.nome = props.nome;
    this.taxasPercentuais = props.taxasPercentuais;
    this.taxasFixasPorPedido = props.taxasFixasPorPedido ?? [];
  }

  percentualTotalSobreVenda(): Percentage {
    return this.taxasPercentuais.reduce((acc, t) => acc.add(t.percentual), Percentage.zero());
  }

  totalTaxasFixasPorPedido(): Money {
    return this.taxasFixasPorPedido.reduce((acc, t) => acc.add(t.valor), Money.zero());
  }
}
