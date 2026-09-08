import { Decimal } from "decimal.js";
import {
  Money,
  Percentage,
  MemorialCalculo,
  CustoFixoMensal,
  DespesaFixa,
  analiseSensibilidadeVolume,
  calcularPontoEquilibrio,
  calcularCustoHoraDerivado,
  calcularCustoMaoDeObraPorUnidade,
  calcularPrecoPorCanais,
  calcularMargemRealDadoPreco,
  MeiStrategy,
  SimplesNacionalStrategy,
  InMemoryTaxRuleRepository,
  RegimeTributarioStrategy,
} from "@calculo-preco/engine";
import { insumoRecordToDomain, fichaTecnicaRecordToDomain, canalVendaRecordToDomain } from "../mappers.js";
import { insumoRepository, fichaTecnicaRepository, despesaFixaRepository, canalVendaRepository, empresaStore } from "../repositories/store.js";
import { EmpresaRecord } from "../records/types.js";

const taxRuleRepository = new InMemoryTaxRuleRepository();

export class EmpresaNaoConfiguradaError extends Error {
  constructor() {
    super("Empresa ainda não configurada. Cadastre o regime tributário em /api/empresa antes de calcular preços.");
    this.name = "EmpresaNaoConfiguradaError";
  }
}

function construirRegimeTributario(empresa: EmpresaRecord): RegimeTributarioStrategy {
  if (empresa.regimeTributario === "MEI") {
    return new MeiStrategy(
      {
        valorDasMeiMensal: Money.fromReais(empresa.dasMeiValorMensalReais ?? 0),
        faturamentoAcumulado12Meses: Money.fromReais(empresa.faturamentoAcumulado12MesesReais ?? 0),
      },
      taxRuleRepository,
    );
  }
  return new SimplesNacionalStrategy(
    {
      anexo: empresa.anexoSimples ?? "I",
      rbt12: Money.fromReais(empresa.rbt12Reais ?? 0),
    },
    taxRuleRepository,
  );
}

async function construirCustoFixoMensal(empresa: EmpresaRecord): Promise<CustoFixoMensal> {
  const despesas: DespesaFixa[] = (await despesaFixaRepository.list()).map((d) => ({
    id: d.id,
    nome: d.nome,
    categoria: d.categoria,
    valorMensal: Money.fromReais(d.valorMensalReais),
  }));

  if (empresa.regimeTributario === "MEI" && empresa.dasMeiValorMensalReais) {
    despesas.push({
      id: "das-mei",
      nome: "DAS-MEI",
      categoria: "tributos",
      valorMensal: Money.fromReais(empresa.dasMeiValorMensalReais),
    });
  }

  return new CustoFixoMensal(despesas);
}

/**
 * Composição do preço é dado de RELATÓRIO (Módulo 5), não entra em nenhum
 * cálculo posterior — por isso fica inteiramente em Decimal (reais, sem
 * arredondamento para centavos). Some tudo e o total pode ficar 1 centavo
 * diferente do preço de venda arredondado; isso é esperado e é o mesmo
 * comportamento de qualquer nota fiscal com itens fracionários.
 */
export interface ComposicaoPreco {
  materiaPrima: Decimal;
  embalagem: Decimal;
  maoDeObra: Decimal;
  custoFixoRateado: Decimal;
  taxasFixasPorPedido: Decimal;
  tributos: Decimal;
  custosVariaveisCanal: Decimal;
  lucroLiquido: Decimal;
  precoVenda: Decimal;
}

function calcularComposicao(params: {
  custoMateriaPrima: Decimal;
  custoEmbalagem: Decimal;
  custoMaoDeObra: Decimal;
  custoFixoRateado: Money;
  taxasFixasPorPedido: Money;
  percentualTributos: Percentage;
  percentualCustosVariaveis: Percentage;
  precoVenda: Money;
  lucroLiquido: Money;
}): ComposicaoPreco {
  const precoVendaDecimal = params.precoVenda.toDecimal();
  return {
    materiaPrima: params.custoMateriaPrima,
    embalagem: params.custoEmbalagem,
    maoDeObra: params.custoMaoDeObra,
    custoFixoRateado: params.custoFixoRateado.toDecimal(),
    taxasFixasPorPedido: params.taxasFixasPorPedido.toDecimal(),
    tributos: precoVendaDecimal.mul(params.percentualTributos.toFraction()),
    custosVariaveisCanal: precoVendaDecimal.mul(params.percentualCustosVariaveis.toFraction()),
    lucroLiquido: params.lucroLiquido.toDecimal(),
    precoVenda: precoVendaDecimal,
  };
}

export interface CalculoPrecoInput {
  fichaTecnicaId: string;
  canalIds: string[];
  volumeEstimadoMensal: number;
  criterioRateio: "volume" | "tempo_producao";
  mixParaRateioPorTempo?: { fichaTecnicaId: string; volumeEstimadoMensal: number }[];
  custoMaoDeObra?: {
    modo: "manual" | "derivado";
    custoHoraReais?: number;
    proLaboreDesejadoMensalReais?: number;
    encargosMensaisReais?: number;
    horasProdutivasMensais?: number;
  };
  percentualMargemLiquidaDesejada: number;
  dataReferencia?: string;
}

export async function calcularPrecoDeVenda(input: CalculoPrecoInput) {
  const empresaRecord = empresaStore.get();
  if (!empresaRecord) throw new EmpresaNaoConfiguradaError();

  const fichaRecord = await fichaTecnicaRepository.get(input.fichaTecnicaId);
  if (!fichaRecord) throw new Error(`Ficha técnica "${input.fichaTecnicaId}" não encontrada.`);
  const ficha = fichaTecnicaRecordToDomain(fichaRecord);

  const insumoIdsNaFicha = new Set(fichaRecord.itens.map((i) => i.insumoId));
  const insumosRecords = (await insumoRepository.list()).filter((i) => insumoIdsNaFicha.has(i.id));
  const insumosPorId = new Map(insumosRecords.map((r) => [r.id, insumoRecordToDomain(r)]));

  // Acumuladores em Decimal (não Money): custo por grama/mL de um insumo é
  // rotineiramente < 1 centavo. Arredondar a cada item zeraria a ficha
  // técnica inteira — ver `Insumo.custoUnitario()` no motor de cálculo.
  let custoMateriaPrima = new Decimal(0);
  let custoEmbalagem = new Decimal(0);
  for (const item of fichaRecord.itens) {
    const insumoRecord = insumosRecords.find((i) => i.id === item.insumoId);
    const insumo = insumosPorId.get(item.insumoId);
    if (!insumoRecord || !insumo) throw new Error(`Insumo "${item.insumoId}" não encontrado.`);
    const custoItem = insumo.custoUnitario().mul(item.quantidade).div(ficha.rendimento);
    if (insumoRecord.categoria === "embalagem") {
      custoEmbalagem = custoEmbalagem.add(custoItem);
    } else {
      custoMateriaPrima = custoMateriaPrima.add(custoItem);
    }
  }

  let custoMaoDeObraUnitario = new Decimal(0);
  if (input.custoMaoDeObra) {
    const custoHora =
      input.custoMaoDeObra.modo === "manual"
        ? new Decimal(input.custoMaoDeObra.custoHoraReais ?? 0)
        : calcularCustoHoraDerivado({
            proLaboreDesejadoMensal: Money.fromReais(input.custoMaoDeObra.proLaboreDesejadoMensalReais ?? 0),
            encargosMensais: Money.fromReais(input.custoMaoDeObra.encargosMensaisReais ?? 0),
            horasProdutivasMensais: new Decimal(input.custoMaoDeObra.horasProdutivasMensais ?? 1),
          });
    custoMaoDeObraUnitario = calcularCustoMaoDeObraPorUnidade(custoHora, ficha.tempoProducaoPorUnidadeMinutos());
  }

  // ÚNICO ponto de arredondamento para centavos do custo direto: soma tudo
  // em Decimal primeiro, converte para Money (HALF_UP, 2 casas) só aqui,
  // porque é o valor que efetivamente entra na fórmula de precificação.
  const custoDiretoUnitario = Money.fromReais(custoMateriaPrima.add(custoEmbalagem).add(custoMaoDeObraUnitario));

  const custoFixoMensal = await construirCustoFixoMensal(empresaRecord);
  const volumeEstimadoMensal = new Decimal(input.volumeEstimadoMensal);

  let custoFixoRateadoUnitario: Money;
  if (input.criterioRateio === "tempo_producao") {
    const mix = [
      { produtoId: ficha.id, tempoProducaoMinutosPorUnidade: ficha.tempoProducaoPorUnidadeMinutos(), volumeEstimadoMensal },
      ...(await Promise.all(
        (input.mixParaRateioPorTempo ?? [])
          .filter((m) => m.fichaTecnicaId !== ficha.id)
          .map(async (m) => {
            const outraFichaRecord = await fichaTecnicaRepository.get(m.fichaTecnicaId);
            if (!outraFichaRecord) throw new Error(`Ficha técnica "${m.fichaTecnicaId}" do mix não encontrada.`);
            const outraFicha = fichaTecnicaRecordToDomain(outraFichaRecord);
            return {
              produtoId: outraFicha.id,
              tempoProducaoMinutosPorUnidade: outraFicha.tempoProducaoPorUnidadeMinutos(),
              volumeEstimadoMensal: new Decimal(m.volumeEstimadoMensal),
            };
          }),
      )),
    ];
    custoFixoRateadoUnitario = custoFixoMensal.rateioPorTempoProducao(mix).get(ficha.id)!;
  } else {
    custoFixoRateadoUnitario = custoFixoMensal.rateioPorVolume(volumeEstimadoMensal);
  }

  const canaisRecords = await Promise.all(
    input.canalIds.map(async (canalId) => {
      const canalRecord = await canalVendaRepository.get(canalId);
      if (!canalRecord) throw new Error(`Canal de venda "${canalId}" não encontrado.`);
      return canalRecord;
    }),
  );

  const regime = construirRegimeTributario(empresaRecord);
  const dataReferencia = input.dataReferencia ? new Date(input.dataReferencia) : new Date();
  const percentualMargemLiquidaDesejada = Percentage.fromPercent(input.percentualMargemLiquidaDesejada);
  const percentualTributos = regime.calcular(dataReferencia, new MemorialCalculo()).percentualSobreVenda;

  const resultadosPorCanal = calcularPrecoPorCanais(
    canaisRecords.map((canalRecord) => {
      const canal = canalVendaRecordToDomain(canalRecord);
      return {
        canalId: canal.id,
        canalNome: canal.nome,
        regime,
        dataReferencia,
        custoDiretoUnitario,
        custoFixoRateadoUnitario,
        percentualCustosVariaveisCanal: canal.percentualTotalSobreVenda(),
        custosFixosPorPedidoCanal: canal.totalTaxasFixasPorPedido(),
        percentualMargemLiquidaDesejada,
      };
    }),
  );

  const sensibilidadeVolume = analiseSensibilidadeVolume(custoFixoMensal, volumeEstimadoMensal);

  return resultadosPorCanal.map(({ canalId, canalNome, resultado }) => {
    const canalRecord = canaisRecords.find((c) => c.id === canalId)!;
    const canal = canalVendaRecordToDomain(canalRecord);

    const composicao = calcularComposicao({
      custoMateriaPrima,
      custoEmbalagem,
      custoMaoDeObra: custoMaoDeObraUnitario,
      custoFixoRateado: custoFixoRateadoUnitario,
      taxasFixasPorPedido: canal.totalTaxasFixasPorPedido(),
      percentualTributos,
      percentualCustosVariaveis: canal.percentualTotalSobreVenda(),
      precoVenda: resultado.precoVenda,
      lucroLiquido: resultado.lucroLiquidoUnitario,
    });

    let pontoEquilibrio: ReturnType<typeof calcularPontoEquilibrio> | null = null;
    try {
      pontoEquilibrio = calcularPontoEquilibrio(custoFixoMensal.totalMensal(), resultado.margemContribuicaoValorUnitario, resultado.precoVenda);
    } catch {
      pontoEquilibrio = null;
    }

    const alertaMargemMinima =
      empresaRecord.margemLiquidaMinimaAlertaPercent !== undefined &&
      input.percentualMargemLiquidaDesejada < empresaRecord.margemLiquidaMinimaAlertaPercent
        ? `Margem líquida desejada (${input.percentualMargemLiquidaDesejada}%) está abaixo do mínimo configurado (${empresaRecord.margemLiquidaMinimaAlertaPercent}%).`
        : null;

    return {
      canalId,
      canalNome,
      precoVenda: resultado.precoVenda.toJSON(),
      precoVendaFormatado: resultado.precoVenda.format(),
      lucroLiquidoUnitario: resultado.lucroLiquidoUnitario.toJSON(),
      markupEquivalente: resultado.markupEquivalente.toNumber(),
      margemContribuicao: resultado.margemContribuicao.toNumber(),
      // Composição é dado de relatório (Módulo 5): reais em Decimal, sem
      // passar por Money — ver comentário em `calcularComposicao`.
      composicao: {
        materiaPrima: composicao.materiaPrima.toDecimalPlaces(4).toNumber(),
        embalagem: composicao.embalagem.toDecimalPlaces(4).toNumber(),
        maoDeObra: composicao.maoDeObra.toDecimalPlaces(4).toNumber(),
        custoFixoRateado: composicao.custoFixoRateado.toDecimalPlaces(4).toNumber(),
        taxasFixasPorPedido: composicao.taxasFixasPorPedido.toDecimalPlaces(4).toNumber(),
        tributos: composicao.tributos.toDecimalPlaces(4).toNumber(),
        custosVariaveisCanal: composicao.custosVariaveisCanal.toDecimalPlaces(4).toNumber(),
        lucroLiquido: composicao.lucroLiquido.toDecimalPlaces(4).toNumber(),
      },
      pontoEquilibrio: pontoEquilibrio
        ? { unidades: pontoEquilibrio.unidades.toNumber(), faturamento: pontoEquilibrio.faturamento.toJSON() }
        : null,
      sensibilidadeVolume: sensibilidadeVolume.map((s) => ({
        percentualDoVolumeEstimado: s.percentualDoVolumeEstimado,
        volume: s.volume.toNumber(),
        custoFixoRateadoPorUnidade: s.custoFixoRateadoPorUnidade.toJSON(),
      })),
      alertasTributarios: resultado.alertasTributarios,
      alertaMargemMinima,
      memorial: resultado.memorial,
      avisoLegal:
        "Estimativa gerada automaticamente com base na legislação vigente na data de referência informada. Não substitui orientação de um contador.",
    };
  });
}

export interface EngenhariaReversaInput {
  fichaTecnicaId: string;
  canalId: string;
  precoMercado: number;
  volumeEstimadoMensal: number;
  criterioRateio: "volume" | "tempo_producao";
  dataReferencia?: string;
}

export async function calcularMargemRealParaPreco(input: EngenhariaReversaInput) {
  const empresaRecord = empresaStore.get();
  if (!empresaRecord) throw new EmpresaNaoConfiguradaError();

  const fichaRecord = await fichaTecnicaRepository.get(input.fichaTecnicaId);
  if (!fichaRecord) throw new Error(`Ficha técnica "${input.fichaTecnicaId}" não encontrada.`);
  const ficha = fichaTecnicaRecordToDomain(fichaRecord);

  const insumoIdsNaFicha = new Set(fichaRecord.itens.map((i) => i.insumoId));
  const insumosRecords = (await insumoRepository.list()).filter((i) => insumoIdsNaFicha.has(i.id));
  const insumosPorId = new Map(insumosRecords.map((r) => [r.id, insumoRecordToDomain(r)]));
  // Único ponto de arredondamento para centavos — igual ao cálculo direto.
  const custoDiretoUnitario = Money.fromReais(ficha.custoInsumosPorUnidade(insumosPorId));

  const custoFixoMensal = await construirCustoFixoMensal(empresaRecord);
  const custoFixoRateadoUnitario = custoFixoMensal.rateioPorVolume(new Decimal(input.volumeEstimadoMensal));

  const canalRecord = await canalVendaRepository.get(input.canalId);
  if (!canalRecord) throw new Error(`Canal de venda "${input.canalId}" não encontrado.`);
  const canal = canalVendaRecordToDomain(canalRecord);

  const regime = construirRegimeTributario(empresaRecord);
  const dataReferencia = input.dataReferencia ? new Date(input.dataReferencia) : new Date();
  const resultadoRegime = regime.calcular(dataReferencia, new MemorialCalculo());

  const resultado = calcularMargemRealDadoPreco({
    precoMercado: Money.fromReais(input.precoMercado),
    custoDiretoUnitario,
    custoFixoRateadoUnitario,
    custosFixosPorPedidoUnitario: canal.totalTaxasFixasPorPedido(),
    percentualTributos: resultadoRegime.percentualSobreVenda,
    percentualCustosVariaveis: canal.percentualTotalSobreVenda(),
  });

  return {
    margemLiquidaReal: resultado.margemLiquidaReal.toNumber(),
    margemLiquidaRealFormatada: resultado.margemLiquidaReal.toDisplayString(),
    lucroLiquidoUnitario: resultado.lucroLiquidoUnitario.toJSON(),
    prejuizo: resultado.margemLiquidaReal.isNegative(),
    memorial: resultado.memorial,
    avisoLegal:
      "Estimativa gerada automaticamente com base na legislação vigente na data de referência informada. Não substitui orientação de um contador.",
  };
}
