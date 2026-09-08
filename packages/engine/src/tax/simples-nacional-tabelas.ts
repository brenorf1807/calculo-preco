import { Money } from "../domain/money.js";
import { Percentage } from "../domain/percentage.js";
import type { RegraVigente } from "./vigencia.js";

export type AnexoSimples = "I" | "III";

export interface FaixaSimplesNacional extends RegraVigente {
  anexo: AnexoSimples;
  ordem: number;
  receitaBruta12MesesMin: Money;
  /** null = sem teto (última faixa antes do desenquadramento do Simples). */
  receitaBruta12MesesMax: Money | null;
  aliquotaNominal: Percentage;
  parcelaADeduzir: Money;
}

/**
 * Fonte: Lei Complementar 123/2006, Anexos I e III, na redação dada pela
 * LC 155/2016 — tabelas vigentes desde 01/01/2018 e ainda em vigor no início
 * de 2026. A Reforma Tributária (LC 214/2025) altera a composição interna
 * do DAS a partir de 2027 (ver módulo `reforma`), mas não a estrutura de
 * faixas/alíquota efetiva em si até então.
 *
 * ATENÇÃO — regulamentação em aberto: valores de 2027 em diante (novas
 * faixas ou não) ainda dependem de regulamentação complementar. Antes de
 * usar este sistema para produtos vendidos em 2027+, confirme com um
 * contador se esta tabela segue válida.
 */
const FONTE_LC123_ANEXOS_I_III = "LC 123/2006, Anexos I e III (redação da LC 155/2016), vigente desde 01/01/2018";

export const TABELA_SIMPLES_ANEXO_I: FaixaSimplesNacional[] = [
  { anexo: "I", ordem: 1, receitaBruta12MesesMin: Money.fromReais(0), receitaBruta12MesesMax: Money.fromReais(180_000), aliquotaNominal: Percentage.fromPercent(4.0), parcelaADeduzir: Money.fromReais(0), vigenciaInicio: new Date("2018-01-01"), vigenciaFim: null, fonte: FONTE_LC123_ANEXOS_I_III },
  { anexo: "I", ordem: 2, receitaBruta12MesesMin: Money.fromReais(180_000.01), receitaBruta12MesesMax: Money.fromReais(360_000), aliquotaNominal: Percentage.fromPercent(7.3), parcelaADeduzir: Money.fromReais(5_940), vigenciaInicio: new Date("2018-01-01"), vigenciaFim: null, fonte: FONTE_LC123_ANEXOS_I_III },
  { anexo: "I", ordem: 3, receitaBruta12MesesMin: Money.fromReais(360_000.01), receitaBruta12MesesMax: Money.fromReais(720_000), aliquotaNominal: Percentage.fromPercent(9.5), parcelaADeduzir: Money.fromReais(13_860), vigenciaInicio: new Date("2018-01-01"), vigenciaFim: null, fonte: FONTE_LC123_ANEXOS_I_III },
  { anexo: "I", ordem: 4, receitaBruta12MesesMin: Money.fromReais(720_000.01), receitaBruta12MesesMax: Money.fromReais(1_800_000), aliquotaNominal: Percentage.fromPercent(10.7), parcelaADeduzir: Money.fromReais(22_500), vigenciaInicio: new Date("2018-01-01"), vigenciaFim: null, fonte: FONTE_LC123_ANEXOS_I_III },
  { anexo: "I", ordem: 5, receitaBruta12MesesMin: Money.fromReais(1_800_000.01), receitaBruta12MesesMax: Money.fromReais(3_600_000), aliquotaNominal: Percentage.fromPercent(14.3), parcelaADeduzir: Money.fromReais(87_300), vigenciaInicio: new Date("2018-01-01"), vigenciaFim: null, fonte: FONTE_LC123_ANEXOS_I_III },
  { anexo: "I", ordem: 6, receitaBruta12MesesMin: Money.fromReais(3_600_000.01), receitaBruta12MesesMax: Money.fromReais(4_800_000), aliquotaNominal: Percentage.fromPercent(19.0), parcelaADeduzir: Money.fromReais(378_000), vigenciaInicio: new Date("2018-01-01"), vigenciaFim: null, fonte: FONTE_LC123_ANEXOS_I_III },
];

export const TABELA_SIMPLES_ANEXO_III: FaixaSimplesNacional[] = [
  { anexo: "III", ordem: 1, receitaBruta12MesesMin: Money.fromReais(0), receitaBruta12MesesMax: Money.fromReais(180_000), aliquotaNominal: Percentage.fromPercent(6.0), parcelaADeduzir: Money.fromReais(0), vigenciaInicio: new Date("2018-01-01"), vigenciaFim: null, fonte: FONTE_LC123_ANEXOS_I_III },
  { anexo: "III", ordem: 2, receitaBruta12MesesMin: Money.fromReais(180_000.01), receitaBruta12MesesMax: Money.fromReais(360_000), aliquotaNominal: Percentage.fromPercent(11.2), parcelaADeduzir: Money.fromReais(9_360), vigenciaInicio: new Date("2018-01-01"), vigenciaFim: null, fonte: FONTE_LC123_ANEXOS_I_III },
  { anexo: "III", ordem: 3, receitaBruta12MesesMin: Money.fromReais(360_000.01), receitaBruta12MesesMax: Money.fromReais(720_000), aliquotaNominal: Percentage.fromPercent(13.5), parcelaADeduzir: Money.fromReais(17_640), vigenciaInicio: new Date("2018-01-01"), vigenciaFim: null, fonte: FONTE_LC123_ANEXOS_I_III },
  { anexo: "III", ordem: 4, receitaBruta12MesesMin: Money.fromReais(720_000.01), receitaBruta12MesesMax: Money.fromReais(1_800_000), aliquotaNominal: Percentage.fromPercent(16.0), parcelaADeduzir: Money.fromReais(35_640), vigenciaInicio: new Date("2018-01-01"), vigenciaFim: null, fonte: FONTE_LC123_ANEXOS_I_III },
  { anexo: "III", ordem: 5, receitaBruta12MesesMin: Money.fromReais(1_800_000.01), receitaBruta12MesesMax: Money.fromReais(3_600_000), aliquotaNominal: Percentage.fromPercent(21.0), parcelaADeduzir: Money.fromReais(125_640), vigenciaInicio: new Date("2018-01-01"), vigenciaFim: null, fonte: FONTE_LC123_ANEXOS_I_III },
  { anexo: "III", ordem: 6, receitaBruta12MesesMin: Money.fromReais(3_600_000.01), receitaBruta12MesesMax: Money.fromReais(4_800_000), aliquotaNominal: Percentage.fromPercent(33.0), parcelaADeduzir: Money.fromReais(648_000), vigenciaInicio: new Date("2018-01-01"), vigenciaFim: null, fonte: FONTE_LC123_ANEXOS_I_III },
];
