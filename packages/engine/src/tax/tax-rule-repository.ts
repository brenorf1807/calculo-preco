import { encontrarVigente } from "./vigencia.js";
import { AnexoSimples, FaixaSimplesNacional, TABELA_SIMPLES_ANEXO_I, TABELA_SIMPLES_ANEXO_III } from "./simples-nacional-tabelas.js";
import { LimiteFaturamentoMei, LIMITE_FATURAMENTO_MEI } from "./mei-tabelas.js";

/**
 * Porta de acesso às regras fiscais. A implementação em memória abaixo é
 * suficiente para o MVP; o requisito de "base de dados versionada por
 * data" (nunca hardcoded no código de cálculo) é satisfeito porque o
 * motor de precificação nunca lê `TABELA_SIMPLES_*`/`LIMITE_FATURAMENTO_MEI`
 * diretamente — sempre passa por esta interface. Trocar por uma tabela real
 * (Postgres/Firestore) na Fase 2/3 não muda uma linha do motor.
 */
export interface TaxRuleRepository {
  getFaixasSimplesNacional(anexo: AnexoSimples, dataReferencia: Date): FaixaSimplesNacional[];
  getLimiteFaturamentoMei(dataReferencia: Date): LimiteFaturamentoMei | null;
}

export class InMemoryTaxRuleRepository implements TaxRuleRepository {
  getFaixasSimplesNacional(anexo: AnexoSimples, dataReferencia: Date): FaixaSimplesNacional[] {
    const tabela = anexo === "I" ? TABELA_SIMPLES_ANEXO_I : TABELA_SIMPLES_ANEXO_III;
    return encontrarVigente(tabela, dataReferencia);
  }

  getLimiteFaturamentoMei(dataReferencia: Date): LimiteFaturamentoMei | null {
    const vigentes = encontrarVigente(LIMITE_FATURAMENTO_MEI, dataReferencia);
    return vigentes[0] ?? null;
  }
}
