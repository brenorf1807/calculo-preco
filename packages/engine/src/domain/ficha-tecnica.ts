import { Decimal } from "decimal.js";
import { Insumo } from "./insumo.js";

export interface ItemFicha {
  insumoId: string;
  quantidade: Decimal;
}

export interface FichaTecnicaProps {
  id: string;
  nome: string;
  itens: ItemFicha[];
  /** Quantas unidades do produto essa ficha rende (ex.: receita rende 24 unidades). */
  rendimento: Decimal;
  tempoProducaoMinutos: Decimal;
}

/**
 * MVP (Fase 1): ficha técnica de 1 nível — cada item referencia um Insumo
 * diretamente. Composição multinível (subprodutos com ficha própria e
 * detecção de referência circular) é Fase 2.
 */
export class FichaTecnica {
  readonly id: string;
  readonly nome: string;
  readonly itens: ItemFicha[];
  readonly rendimento: Decimal;
  readonly tempoProducaoMinutos: Decimal;

  constructor(props: FichaTecnicaProps) {
    if (props.rendimento.lte(0)) {
      throw new Error(`Ficha técnica "${props.nome}": rendimento deve ser > 0.`);
    }
    if (props.itens.length === 0) {
      throw new Error(`Ficha técnica "${props.nome}": precisa de ao menos 1 insumo.`);
    }
    this.id = props.id;
    this.nome = props.nome;
    this.itens = props.itens;
    this.rendimento = props.rendimento;
    this.tempoProducaoMinutos = props.tempoProducaoMinutos;
  }

  /**
   * Retorna Decimal (reais, precisão arbitrária) — soma de custos unitários
   * fracionários de centavo sem arredondar a cada item. Ver comentário em
   * `Insumo.custoUnitario()`. Quem consome este valor decide onde converter
   * para Money (o ponto de arredondamento documentado é o custo direto
   * total, na camada de orquestração do cálculo de preço).
   */
  custoTotalInsumos(insumosPorId: Map<string, Insumo>): Decimal {
    let total = new Decimal(0);
    for (const item of this.itens) {
      const insumo = insumosPorId.get(item.insumoId);
      if (!insumo) {
        throw new Error(`Insumo "${item.insumoId}" não encontrado para a ficha "${this.nome}".`);
      }
      total = total.add(insumo.custoUnitario().mul(item.quantidade));
    }
    return total;
  }

  custoInsumosPorUnidade(insumosPorId: Map<string, Insumo>): Decimal {
    return this.custoTotalInsumos(insumosPorId).div(this.rendimento);
  }

  tempoProducaoPorUnidadeMinutos(): Decimal {
    return this.tempoProducaoMinutos.div(this.rendimento);
  }
}
