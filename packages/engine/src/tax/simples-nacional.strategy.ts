import { Money } from "../domain/money.js";
import { Percentage } from "../domain/percentage.js";
import { MemorialCalculo } from "../domain/memorial.js";
import { RegimeTributarioStrategy, ResultadoRegimeTributario, AlertaTributario } from "./regime-tributario.strategy.js";
import { TaxRuleRepository } from "./tax-rule-repository.js";
import { AnexoSimples, FaixaSimplesNacional } from "./simples-nacional-tabelas.js";

export interface SimplesNacionalStrategyInput {
  anexo: AnexoSimples;
  /** Receita Bruta dos últimos 12 meses (RBT12). Se a empresa está no 1º ano, ver nota no memorial. */
  rbt12: Money;
}

function encontrarFaixa(faixas: FaixaSimplesNacional[], rbt12: Money): FaixaSimplesNacional {
  const faixa = faixas.find((f) => {
    const dentroDoMinimo = !rbt12.lessThan(f.receitaBruta12MesesMin);
    const dentroDoMaximo = f.receitaBruta12MesesMax === null || !rbt12.greaterThan(f.receitaBruta12MesesMax);
    return dentroDoMinimo && dentroDoMaximo;
  });
  if (!faixa) {
    const ultima = faixas[faixas.length - 1];
    throw new Error(
      `RBT12 (${rbt12.format()}) está acima do teto do Simples Nacional (${ultima?.receitaBruta12MesesMax?.format() ?? "faixa não encontrada"}). A empresa deve migrar para Lucro Presumido/Real.`,
    );
  }
  return faixa;
}

/**
 * Alíquota efetiva = ((RBT12 × Alíquota Nominal) − Parcela a Deduzir) ÷ RBT12
 * (LC 123/2006, art. 18, §1º-A).
 *
 * Empresa em início de atividade (RBT12 = 0 ou não informado): a lei manda
 * usar a média aritmética dos meses de atividade para projetar o RBT12.
 * O MVP simplifica isso usando a alíquota NOMINAL da 1ª faixa (mais
 * conservador que dividir por zero) e sinaliza a simplificação no memorial —
 * refinar isso é item da Fase 2.
 */
export class SimplesNacionalStrategy implements RegimeTributarioStrategy {
  readonly nome = "Simples Nacional";

  constructor(
    private readonly input: SimplesNacionalStrategyInput,
    private readonly taxRules: TaxRuleRepository,
  ) {}

  calcular(dataReferencia: Date, memorial: MemorialCalculo): ResultadoRegimeTributario {
    const alertas: AlertaTributario[] = [];
    const faixas = this.taxRules.getFaixasSimplesNacional(this.input.anexo, dataReferencia);
    if (faixas.length === 0) {
      throw new Error(`Nenhuma tabela do Simples Nacional (Anexo ${this.input.anexo}) vigente para ${dataReferencia.toISOString().slice(0, 10)}.`);
    }

    if (this.input.rbt12.isZero() || this.input.rbt12.isNegative()) {
      const primeiraFaixa = faixas[0]!;
      memorial.registrar({
        descricao: `Empresa em início de atividade (RBT12 não informado): usando alíquota NOMINAL da 1ª faixa do Anexo ${this.input.anexo} como aproximação conservadora`,
        formula: "Aproximação — refinar com contador (média de RBT12 projetada é o cálculo legal correto)",
        valor: primeiraFaixa.aliquotaNominal.toDisplayString(),
        fonte: primeiraFaixa.fonte,
      });
      alertas.push({
        nivel: "atencao",
        mensagem: "RBT12 não informado (empresa nova). Usando a alíquota nominal da 1ª faixa como aproximação — peça ao contador o cálculo pela média de receita projetada, exigido por lei nos primeiros 12 meses.",
      });
      return {
        percentualSobreVenda: primeiraFaixa.aliquotaNominal,
        custoFixoMensalAdicional: Money.zero(),
        alertas,
      };
    }

    const faixa = encontrarFaixa(faixas, this.input.rbt12);
    const rbt12Decimal = this.input.rbt12.toDecimal();
    const aliquotaEfetivaFracao = rbt12Decimal
      .mul(faixa.aliquotaNominal.toFraction())
      .sub(faixa.parcelaADeduzir.toDecimal())
      .div(rbt12Decimal);

    if (aliquotaEfetivaFracao.isNegative()) {
      throw new Error("Alíquota efetiva calculada é negativa — verifique RBT12 e a parcela a deduzir da faixa.");
    }

    const aliquotaEfetiva = Percentage.fromFraction(aliquotaEfetivaFracao);

    memorial.registrar({
      descricao: `Simples Nacional, Anexo ${this.input.anexo}, faixa ${faixa.ordem} (RBT12 ${this.input.rbt12.format()})`,
      formula: `((RBT12 × ${faixa.aliquotaNominal.toDisplayString()}) − ${faixa.parcelaADeduzir.format()}) ÷ RBT12`,
      valor: aliquotaEfetiva.toDisplayString(4),
      regraAplicada: `Anexo ${this.input.anexo}, faixa ${faixa.ordem}`,
      fonte: faixa.fonte,
    });

    if (faixa.receitaBruta12MesesMax) {
      const proximidade = rbt12Decimal.div(faixa.receitaBruta12MesesMax.toDecimal());
      if (proximidade.gte(0.9)) {
        alertas.push({
          nivel: "atencao",
          mensagem: `RBT12 está a ${proximidade.mul(100).toFixed(0)}% do teto da faixa ${faixa.ordem} do Anexo ${this.input.anexo}. Ultrapassar o teto sobe a alíquota efetiva (efeito degrau) — revise o preço se o faturamento continuar crescendo.`,
        });
      }
    }

    return {
      percentualSobreVenda: aliquotaEfetiva,
      custoFixoMensalAdicional: Money.zero(),
      alertas,
    };
  }
}
