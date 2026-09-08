import { Money } from "../domain/money.js";
import type { RegraVigente } from "./vigencia.js";

export interface LimiteFaturamentoMei extends RegraVigente {
  valorAnual: Money;
}

/**
 * Fonte: LC 123/2006, art. 18-A, §1º (redação da LC 155/2016) — limite de
 * R$ 81.000,00/ano vigente desde 01/01/2018. Ainda vigente no início de
 * 2026; a Reforma Tributária não alterou este teto até o momento da
 * elaboração deste sistema. CONFIRME com um contador antes de usar para
 * projeções de 2027 em diante.
 */
export const LIMITE_FATURAMENTO_MEI: LimiteFaturamentoMei[] = [
  {
    valorAnual: Money.fromReais(81_000),
    vigenciaInicio: new Date("2018-01-01"),
    vigenciaFim: null,
    fonte: "LC 123/2006, art. 18-A, §1º (redação da LC 155/2016)",
  },
];

/**
 * O valor do DAS-MEI (contribuição fixa mensal) NÃO é hardcoded aqui: ele é
 * composto por INSS (5% do salário mínimo vigente, arredondado) + ICMS
 * (R$1,00, comércio/indústria) e/ou ISS (R$5,00, serviços), e muda todo
 * janeiro por causa do reajuste do salário mínimo. Pedir esse valor como
 * entrada do usuário (ele confere no gerador de boleto do Portal do
 * Empreendedor) é mais seguro do que o sistema arriscar um valor errado.
 */
export const PERCENTUAL_ALERTA_PROXIMIDADE_LIMITE_MEI = 0.8;
