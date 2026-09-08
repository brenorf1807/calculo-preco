import { Money } from "../domain/money.js";
import { Percentage } from "../domain/percentage.js";
import { MemorialCalculo } from "../domain/memorial.js";
import { RegimeTributarioStrategy, ResultadoRegimeTributario, AlertaTributario } from "./regime-tributario.strategy.js";
import { TaxRuleRepository } from "./tax-rule-repository.js";
import { PERCENTUAL_ALERTA_PROXIMIDADE_LIMITE_MEI } from "./mei-tabelas.js";

export interface MeiStrategyInput {
  /** Valor do DAS-MEI informado pelo usuário (consulta no Portal do Empreendedor) — não é calculado pelo sistema. */
  valorDasMeiMensal: Money;
  faturamentoAcumulado12Meses: Money;
}

/**
 * MEI é tributado por valor FIXO mensal (DAS-MEI), não por percentual sobre
 * faturamento. Por isso ele nunca entra no denominador da fórmula de
 * precificação — é modelado como custo fixo mensal (Módulo 2). Tratar o
 * DAS-MEI como percentual é o erro mais comum de calculadoras concorrentes.
 */
export class MeiStrategy implements RegimeTributarioStrategy {
  readonly nome = "MEI";

  constructor(
    private readonly input: MeiStrategyInput,
    private readonly taxRules: TaxRuleRepository,
  ) {}

  calcular(dataReferencia: Date, memorial: MemorialCalculo): ResultadoRegimeTributario {
    const alertas: AlertaTributario[] = [];
    const limite = this.taxRules.getLimiteFaturamentoMei(dataReferencia);

    memorial.registrar({
      descricao: "Regime tributário: MEI — DAS-MEI é valor fixo mensal, tratado como custo fixo (não como % sobre venda)",
      valor: this.input.valorDasMeiMensal.format(),
      regraAplicada: "DAS-MEI (informado pelo usuário)",
    });

    if (limite) {
      const percentualDoLimite = this.input.faturamentoAcumulado12Meses.toDecimal().div(limite.valorAnual.toDecimal());
      memorial.registrar({
        descricao: "Verificação do limite anual de faturamento do MEI",
        formula: `faturamento12m (${this.input.faturamentoAcumulado12Meses.format()}) / limite anual (${limite.valorAnual.format()})`,
        valor: `${percentualDoLimite.mul(100).toFixed(1)}%`,
        fonte: limite.fonte,
      });

      if (this.input.faturamentoAcumulado12Meses.greaterThan(limite.valorAnual)) {
        alertas.push({
          nivel: "critico",
          mensagem: `Faturamento acumulado (${this.input.faturamentoAcumulado12Meses.format()}) ultrapassou o limite anual do MEI (${limite.valorAnual.format()}). Simule a migração para Simples Nacional (ME) — a tributação por percentual sobre faturamento passa a se aplicar.`,
        });
      } else if (percentualDoLimite.gte(PERCENTUAL_ALERTA_PROXIMIDADE_LIMITE_MEI)) {
        alertas.push({
          nivel: "atencao",
          mensagem: `Faturamento em ${percentualDoLimite.mul(100).toFixed(0)}% do limite anual do MEI (${limite.valorAnual.format()}). Se ultrapassar, será necessário migrar para ME (Simples Nacional) e revisar toda a precificação.`,
        });
      }
    } else {
      alertas.push({
        nivel: "atencao",
        mensagem: "Não há regra de limite de faturamento do MEI vigente para a data de referência — verifique com um contador.",
      });
    }

    return {
      percentualSobreVenda: Percentage.zero(),
      custoFixoMensalAdicional: this.input.valorDasMeiMensal,
      alertas,
    };
  }
}
