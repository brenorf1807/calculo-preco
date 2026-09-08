import { Decimal } from "decimal.js";
import { Money } from "./money.js";

export interface DespesaFixa {
  id: string;
  nome: string;
  categoria: string;
  valorMensal: Money;
}

export type CriterioRateio = "volume" | "tempo_producao";

export interface ProdutoParaRateioPorTempo {
  produtoId: string;
  tempoProducaoMinutosPorUnidade: Decimal;
  volumeEstimadoMensal: Decimal;
}

export class CustoFixoMensal {
  constructor(private readonly despesas: DespesaFixa[]) {}

  totalMensal(): Money {
    return this.despesas.reduce((acc, d) => acc.add(d.valorMensal), Money.zero());
  }

  /** Critério (a): rateio simples pelo volume total estimado de produção/venda no mês. */
  rateioPorVolume(volumeEstimadoMensal: Decimal): Money {
    if (volumeEstimadoMensal.lte(0)) {
      throw new Error("volumeEstimadoMensal deve ser > 0 para ratear custo fixo.");
    }
    return this.totalMensal().divide(volumeEstimadoMensal);
  }

  /**
   * Critério (b): rateio proporcional ao tempo de produção de cada produto —
   * mais justo quando produtos têm complexidade muito diferente entre si.
   * Retorna o custo fixo rateado por unidade de cada produto do mix.
   */
  rateioPorTempoProducao(mix: ProdutoParaRateioPorTempo[]): Map<string, Money> {
    if (mix.length === 0) {
      throw new Error("Mix de produtos vazio para rateio por tempo de produção.");
    }
    const tempoTotalMinutos = mix.reduce(
      (acc, p) => acc.add(p.tempoProducaoMinutosPorUnidade.mul(p.volumeEstimadoMensal)),
      new Decimal(0),
    );
    if (tempoTotalMinutos.lte(0)) {
      throw new Error("Tempo total de produção do mix deve ser > 0.");
    }
    const total = this.totalMensal();
    const resultado = new Map<string, Money>();
    for (const p of mix) {
      const proporcaoTempo = p.tempoProducaoMinutosPorUnidade.mul(p.volumeEstimadoMensal).div(tempoTotalMinutos);
      const custoFixoAlocadoAoProduto = total.multiply(proporcaoTempo);
      resultado.set(p.produtoId, custoFixoAlocadoAoProduto.divide(p.volumeEstimadoMensal));
    }
    return resultado;
  }
}

export interface SensibilidadeVolumeResultado {
  percentualDoVolumeEstimado: number;
  volume: Decimal;
  custoFixoRateadoPorUnidade: Money;
}

/**
 * Armadilha do rateio: se o volume real cair, o custo fixo por unidade sobe
 * e a margem evapora — mesmo com o preço de venda inalterado.
 */
export function analiseSensibilidadeVolume(
  custoFixo: CustoFixoMensal,
  volumeEstimadoMensal: Decimal,
  cenarios: number[] = [0.7, 1.0, 1.3],
): SensibilidadeVolumeResultado[] {
  return cenarios.map((percentual) => {
    const volume = volumeEstimadoMensal.mul(percentual);
    return {
      percentualDoVolumeEstimado: percentual,
      volume,
      custoFixoRateadoPorUnidade: custoFixo.rateioPorVolume(volume),
    };
  });
}

export interface PontoEquilibrio {
  unidades: Decimal;
  faturamento: Money;
}

/**
 * Ponto de equilíbrio (break-even) = Custo Fixo Total ÷ Margem de
 * Contribuição unitária (valor em R$, não percentual).
 */
export function calcularPontoEquilibrio(custoFixoTotalMensal: Money, margemContribuicaoUnitaria: Money, precoVenda: Money): PontoEquilibrio {
  if (!margemContribuicaoUnitaria.greaterThan(Money.zero())) {
    throw new Error(
      "Margem de contribuição unitária deve ser positiva para calcular o ponto de equilíbrio — do contrário nunca cobre o custo fixo.",
    );
  }
  const unidades = custoFixoTotalMensal.toDecimal().div(margemContribuicaoUnitaria.toDecimal());
  const faturamento = precoVenda.multiply(unidades);
  return { unidades, faturamento };
}
