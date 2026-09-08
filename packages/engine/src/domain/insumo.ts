import { Decimal } from "decimal.js";
import { Money } from "./money.js";
import { Percentage } from "./percentage.js";

export type UnidadeMedida = "kg" | "g" | "L" | "mL" | "m" | "cm" | "unidade" | "pacote";

export interface HistoricoPreco {
  data: Date;
  precoCompra: Money;
}

export interface InsumoProps {
  id: string;
  nome: string;
  categoria: "materia_prima" | "embalagem";
  unidadeCompra: UnidadeMedida;
  precoCompra: Money;
  quantidadeEmbalagem: Decimal;
  unidadeConsumo: UnidadeMedida;
  fatorConversao: Decimal;
  percentualPerda: Percentage;
  fornecedorId?: string;
  historicoPrecos?: HistoricoPreco[];
}

/**
 * custoUnitario = (precoCompra / quantidadeEmbalagem / fatorConversao) / (1 − percentualPerda)
 *
 * fatorConversao é "quantas unidades de consumo cabem em 1 unidade de compra"
 * (ex.: compra em kg, consome em g => fatorConversao = 1000).
 */
export class Insumo {
  readonly id: string;
  readonly nome: string;
  readonly categoria: "materia_prima" | "embalagem";
  readonly unidadeCompra: UnidadeMedida;
  readonly precoCompra: Money;
  readonly quantidadeEmbalagem: Decimal;
  readonly unidadeConsumo: UnidadeMedida;
  readonly fatorConversao: Decimal;
  readonly percentualPerda: Percentage;
  readonly fornecedorId?: string;
  readonly historicoPrecos: HistoricoPreco[];

  constructor(props: InsumoProps) {
    if (props.quantidadeEmbalagem.lte(0)) {
      throw new Error(`Insumo "${props.nome}": quantidadeEmbalagem deve ser > 0.`);
    }
    if (props.fatorConversao.lte(0)) {
      throw new Error(`Insumo "${props.nome}": fatorConversao deve ser > 0.`);
    }
    if (props.percentualPerda.toFraction().gte(1) || props.percentualPerda.isNegative()) {
      throw new Error(`Insumo "${props.nome}": percentualPerda deve estar entre 0 e 100%.`);
    }
    this.id = props.id;
    this.nome = props.nome;
    this.categoria = props.categoria;
    this.unidadeCompra = props.unidadeCompra;
    this.precoCompra = props.precoCompra;
    this.quantidadeEmbalagem = props.quantidadeEmbalagem;
    this.unidadeConsumo = props.unidadeConsumo;
    this.fatorConversao = props.fatorConversao;
    this.percentualPerda = props.percentualPerda;
    this.fornecedorId = props.fornecedorId;
    this.historicoPrecos = props.historicoPrecos ?? [];
  }

  /**
   * Custo por 1 unidade de consumo, já considerando perda/quebra técnica.
   *
   * Retorna Decimal (reais em precisão arbitrária), NÃO Money: o custo por
   * grama/mL de um insumo é rotineiramente menor que 1 centavo (ex.:
   * farinha a R$6,50/5kg custa ~R$0,0013/g). Arredondar para centavos aqui
   * — como uma implementação ingênua com Money faria — zera esse custo e
   * distorce a ficha técnica inteira. O arredondamento para centavos só
   * acontece uma vez, no fechamento do custo direto total da ficha
   * (ver `FichaTecnica` e a camada de orquestração do cálculo de preço).
   */
  custoUnitario(): Decimal {
    const custoPorUnidadeCompra = this.precoCompra.toDecimal().div(this.quantidadeEmbalagem);
    const custoPorUnidadeConsumoBruto = custoPorUnidadeCompra.div(this.fatorConversao);
    const aproveitamento = new Decimal(1).sub(this.percentualPerda.toFraction());
    return custoPorUnidadeConsumoBruto.div(aproveitamento);
  }
}
