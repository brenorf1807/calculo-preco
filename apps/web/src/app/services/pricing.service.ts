import { Injectable, inject } from '@angular/core';
import { Decimal } from 'decimal.js';
import { Observable, firstValueFrom, from } from 'rxjs';
import {
  Money,
  Percentage,
  MemorialCalculo,
  CustoFixoMensal,
  DespesaFixa as DespesaFixaDominio,
  calcularPontoEquilibrio,
  calcularCustoHoraDerivado,
  calcularCustoMaoDeObraPorUnidade,
  calcularPrecoPorCanais,
  calcularMargemRealDadoPreco,
  MeiStrategy,
  SimplesNacionalStrategy,
  InMemoryTaxRuleRepository,
  RegimeTributarioStrategy,
} from '@calculo-preco/engine';
import { ApiService } from './api.service';
import { insumoParaDominio, fichaTecnicaParaDominio, canalVendaParaDominio } from './engine-mappers';
import {
  CalculoPrecoRequest,
  EngenhariaReversaRequest,
  EngenhariaReversaResultado,
  Empresa,
  FichaTecnica,
  ResultadoPrecoPorCanalDTO,
} from '../models/models';

const taxRuleRepository = new InMemoryTaxRuleRepository();

export class EmpresaNaoConfiguradaError extends Error {
  constructor() {
    super('Empresa ainda não configurada. Cadastre o regime tributário na tela "Empresa" antes de calcular preços.');
    this.name = 'EmpresaNaoConfiguradaError';
  }
}

export class FaturamentoEstimadoNaoConfiguradoError extends Error {
  constructor() {
    super(
      'Informe o "Faturamento mensal estimado" na tela Custos Fixos (ou Empresa) antes de calcular preços — é ele que transforma seus custos fixos num percentual aplicado automaticamente.',
    );
    this.name = 'FaturamentoEstimadoNaoConfiguradoError';
  }
}

function construirRegimeTributario(empresa: Empresa): RegimeTributarioStrategy {
  if (empresa.regimeTributario === 'MEI') {
    return new MeiStrategy(
      {
        valorDasMeiMensal: Money.fromReais(empresa.dasMeiValorMensalReais ?? 0),
        faturamentoAcumulado12Meses: Money.fromReais(empresa.faturamentoAcumulado12MesesReais ?? 0),
      },
      taxRuleRepository,
    );
  }
  return new SimplesNacionalStrategy(
    { anexo: empresa.anexoSimples ?? 'I', rbt12: Money.fromReais(empresa.rbt12Reais ?? 0) },
    taxRuleRepository,
  );
}

/**
 * Orquestra o motor de cálculo (`@calculo-preco/engine`) inteiramente no
 * navegador: busca os dados salvos no Firestore via `ApiService`, monta as
 * entidades de domínio e chama o mesmo motor de cálculo que antes rodava no
 * backend Node. Substitui `packages/api/src/services/calculo.service.ts`,
 * removido junto com o backend.
 */
@Injectable({ providedIn: 'root' })
export class PricingService {
  private readonly api = inject(ApiService);

  private async construirCustoFixoMensal(empresa: Empresa): Promise<CustoFixoMensal> {
    const despesasSalvas = await firstValueFrom(this.api.listarCustosFixos());
    const despesas: DespesaFixaDominio[] = despesasSalvas.map((d) => ({
      id: d.id,
      nome: d.nome,
      categoria: d.categoria,
      valorMensal: Money.fromReais(d.valorMensalReais),
    }));

    if (empresa.regimeTributario === 'MEI' && empresa.dasMeiValorMensalReais) {
      despesas.push({
        id: 'das-mei',
        nome: 'DAS-MEI',
        categoria: 'tributos',
        valorMensal: Money.fromReais(empresa.dasMeiValorMensalReais),
      });
    }

    return new CustoFixoMensal(despesas);
  }

  /**
   * Custo fixo total mensal ÷ faturamento mensal estimado da empresa toda —
   * o mesmo percentual entra em TODO cálculo de preço, de qualquer produto
   * ou canal. Nada de volume por item: rateio por volume exige informar
   * volume a cada cálculo e, se aplicado produto a produto, conta o custo
   * fixo inteiro várias vezes.
   */
  private percentualCustoFixo(empresa: Empresa, custoFixoMensal: CustoFixoMensal): Percentage {
    if (!empresa.faturamentoMensalEstimadoReais || empresa.faturamentoMensalEstimadoReais <= 0) {
      throw new FaturamentoEstimadoNaoConfiguradoError();
    }
    return custoFixoMensal.percentualSobreFaturamento(Money.fromReais(empresa.faturamentoMensalEstimadoReais));
  }

  calcularPreco(input: CalculoPrecoRequest): Observable<ResultadoPrecoPorCanalDTO[]> {
    return from(this.executarCalculoPreco(input));
  }

  private async executarCalculoPreco(input: CalculoPrecoRequest): Promise<ResultadoPrecoPorCanalDTO[]> {
    let empresa: Empresa;
    try {
      empresa = await firstValueFrom(this.api.obterEmpresa());
    } catch {
      throw new EmpresaNaoConfiguradaError();
    }

    const [todasFichas, todosInsumos] = await Promise.all([
      firstValueFrom(this.api.listarFichasTecnicas()),
      firstValueFrom(this.api.listarInsumos()),
    ]);

    let fichaSalva: FichaTecnica;
    if (input.insumoId) {
      // Revenda rápida: precifica o insumo direto, sem precisar de uma ficha técnica salva.
      const insumoAlvo = todosInsumos.find((i) => i.id === input.insumoId);
      if (!insumoAlvo) throw new Error(`Insumo "${input.insumoId}" não encontrado.`);
      fichaSalva = {
        id: `insumo:${insumoAlvo.id}`,
        nome: insumoAlvo.nome,
        tipo: 'revenda',
        itens: [{ insumoId: insumoAlvo.id, quantidade: input.quantidadePorUnidade ?? 1 }],
        rendimento: 1,
        tempoProducaoMinutos: 0,
      };
    } else if (input.fichaTecnicaId) {
      const encontrada = todasFichas.find((f) => f.id === input.fichaTecnicaId);
      if (!encontrada) throw new Error(`Ficha técnica "${input.fichaTecnicaId}" não encontrada.`);
      fichaSalva = encontrada;
    } else {
      throw new Error('Informe uma ficha técnica ou um insumo para calcular o preço.');
    }
    const ficha = fichaTecnicaParaDominio(fichaSalva);

    const insumoIdsNaFicha = new Set(fichaSalva.itens.map((i) => i.insumoId));
    const insumosSalvos = todosInsumos.filter((i) => insumoIdsNaFicha.has(i.id));
    const insumosPorId = new Map(insumosSalvos.map((r) => [r.id, insumoParaDominio(r)]));

    // Acumuladores em Decimal (não Money): custo por grama/mL de um insumo é
    // rotineiramente < 1 centavo. Arredondar a cada item zeraria a ficha
    // técnica inteira — ver `Insumo.custoUnitario()` no motor de cálculo.
    let custoMateriaPrima = new Decimal(0);
    let custoEmbalagem = new Decimal(0);
    for (const item of fichaSalva.itens) {
      const insumoSalvo = insumosSalvos.find((i) => i.id === item.insumoId);
      const insumo = insumosPorId.get(item.insumoId);
      if (!insumoSalvo || !insumo) throw new Error(`Insumo "${item.insumoId}" não encontrado.`);
      const custoItem = insumo.custoUnitario().mul(item.quantidade).div(ficha.rendimento);
      if (insumoSalvo.categoria === 'embalagem') {
        custoEmbalagem = custoEmbalagem.add(custoItem);
      } else {
        custoMateriaPrima = custoMateriaPrima.add(custoItem);
      }
    }

    let custoMaoDeObraUnitario = new Decimal(0);
    if (input.custoMaoDeObra) {
      const custoHora =
        input.custoMaoDeObra.modo === 'manual'
          ? new Decimal(input.custoMaoDeObra.custoHoraReais ?? 0)
          : calcularCustoHoraDerivado({
              proLaboreDesejadoMensal: Money.fromReais(input.custoMaoDeObra.proLaboreDesejadoMensalReais ?? 0),
              encargosMensais: Money.fromReais(input.custoMaoDeObra.encargosMensaisReais ?? 0),
              horasProdutivasMensais: new Decimal(input.custoMaoDeObra.horasProdutivasMensais ?? 1),
            });
      custoMaoDeObraUnitario = calcularCustoMaoDeObraPorUnidade(custoHora, ficha.tempoProducaoPorUnidadeMinutos());
    }

    // ÚNICO ponto de arredondamento para centavos do custo direto.
    const custoDiretoUnitario = Money.fromReais(custoMateriaPrima.add(custoEmbalagem).add(custoMaoDeObraUnitario));

    const custoFixoMensal = await this.construirCustoFixoMensal(empresa);
    const percentualCustoFixo = this.percentualCustoFixo(empresa, custoFixoMensal);

    const todosCanais = await firstValueFrom(this.api.listarCanaisVenda());
    const canaisSalvos = input.canalIds.map((canalId) => {
      const canal = todosCanais.find((c) => c.id === canalId);
      if (!canal) throw new Error(`Canal de venda "${canalId}" não encontrado.`);
      return canal;
    });

    const regime = construirRegimeTributario(empresa);
    const dataReferencia = input.dataReferencia ? new Date(input.dataReferencia) : new Date();
    const percentualMargemLiquidaDesejada = Percentage.fromPercent(input.percentualMargemLiquidaDesejada);
    const percentualTributos = regime.calcular(dataReferencia, new MemorialCalculo()).percentualSobreVenda;

    const resultadosPorCanal = calcularPrecoPorCanais(
      canaisSalvos.map((canalSalvo) => {
        const canal = canalVendaParaDominio(canalSalvo);
        return {
          canalId: canal.id,
          canalNome: canal.nome,
          regime,
          dataReferencia,
          custoDiretoUnitario,
          percentualCustoFixo,
          percentualCustosVariaveisCanal: canal.percentualTotalSobreVenda(),
          custosFixosPorPedidoCanal: canal.totalTaxasFixasPorPedido(),
          percentualMargemLiquidaDesejada,
        };
      }),
    );

    return resultadosPorCanal.map(({ canalId, canalNome, resultado }) => {
      const canalSalvo = canaisSalvos.find((c) => c.id === canalId)!;
      const canal = canalVendaParaDominio(canalSalvo);
      const precoVendaDecimal = resultado.precoVenda.toDecimal();

      // Composição é dado de relatório (Módulo 5): reais em Decimal, sem
      // passar por Money — a soma pode ficar 1 centavo diferente do preço
      // de venda arredondado, mesmo efeito de qualquer nota fiscal com
      // itens fracionários.
      const composicao = {
        materiaPrima: custoMateriaPrima.toDecimalPlaces(4).toNumber(),
        embalagem: custoEmbalagem.toDecimalPlaces(4).toNumber(),
        maoDeObra: custoMaoDeObraUnitario.toDecimalPlaces(4).toNumber(),
        custoFixoRateado: precoVendaDecimal.mul(percentualCustoFixo.toFraction()).toDecimalPlaces(4).toNumber(),
        taxasFixasPorPedido: canal.totalTaxasFixasPorPedido().toDecimal().toDecimalPlaces(4).toNumber(),
        tributos: precoVendaDecimal.mul(percentualTributos.toFraction()).toDecimalPlaces(4).toNumber(),
        custosVariaveisCanal: precoVendaDecimal.mul(canal.percentualTotalSobreVenda().toFraction()).toDecimalPlaces(4).toNumber(),
        lucroLiquido: resultado.lucroLiquidoUnitario.toDecimal().toDecimalPlaces(4).toNumber(),
      };

      let pontoEquilibrio: ReturnType<typeof calcularPontoEquilibrio> | null = null;
      try {
        pontoEquilibrio = calcularPontoEquilibrio(custoFixoMensal.totalMensal(), resultado.margemContribuicaoValorUnitario, resultado.precoVenda);
      } catch {
        pontoEquilibrio = null;
      }

      const alertaMargemMinima =
        empresa.margemLiquidaMinimaAlertaPercent !== undefined && input.percentualMargemLiquidaDesejada < empresa.margemLiquidaMinimaAlertaPercent
          ? `Margem líquida desejada (${input.percentualMargemLiquidaDesejada}%) está abaixo do mínimo configurado (${empresa.margemLiquidaMinimaAlertaPercent}%).`
          : null;

      return {
        canalId,
        canalNome,
        precoVenda: resultado.precoVenda.toJSON(),
        precoVendaFormatado: resultado.precoVenda.format(),
        lucroLiquidoUnitario: resultado.lucroLiquidoUnitario.toJSON(),
        markupEquivalente: resultado.markupEquivalente.toNumber(),
        margemContribuicao: resultado.margemContribuicao.toNumber(),
        percentualCustoFixoAplicado: percentualCustoFixo.toNumber(),
        composicao,
        pontoEquilibrio: pontoEquilibrio
          ? { unidades: pontoEquilibrio.unidades.toNumber(), faturamento: pontoEquilibrio.faturamento.toJSON() }
          : null,
        alertasTributarios: resultado.alertasTributarios,
        alertaMargemMinima,
        memorial: resultado.memorial,
        avisoLegal: 'Estimativa gerada automaticamente com base na legislação vigente na data de referência informada. Não substitui orientação de um contador.',
      };
    });
  }

  calcularEngenhariaReversa(input: EngenhariaReversaRequest): Observable<EngenhariaReversaResultado> {
    return from(this.executarEngenhariaReversa(input));
  }

  private async executarEngenhariaReversa(input: EngenhariaReversaRequest): Promise<EngenhariaReversaResultado> {
    let empresa: Empresa;
    try {
      empresa = await firstValueFrom(this.api.obterEmpresa());
    } catch {
      throw new EmpresaNaoConfiguradaError();
    }

    const todasFichas = await firstValueFrom(this.api.listarFichasTecnicas());
    const fichaSalva = todasFichas.find((f) => f.id === input.fichaTecnicaId);
    if (!fichaSalva) throw new Error(`Ficha técnica "${input.fichaTecnicaId}" não encontrada.`);
    const ficha = fichaTecnicaParaDominio(fichaSalva);

    const insumoIdsNaFicha = new Set(fichaSalva.itens.map((i) => i.insumoId));
    const todosInsumos = await firstValueFrom(this.api.listarInsumos());
    const insumosPorId = new Map(todosInsumos.filter((i) => insumoIdsNaFicha.has(i.id)).map((r) => [r.id, insumoParaDominio(r)]));

    // Único ponto de arredondamento para centavos — igual ao cálculo direto.
    const custoDiretoUnitario = Money.fromReais(ficha.custoInsumosPorUnidade(insumosPorId));

    const custoFixoMensal = await this.construirCustoFixoMensal(empresa);
    const percentualCustoFixo = this.percentualCustoFixo(empresa, custoFixoMensal);

    const todosCanais = await firstValueFrom(this.api.listarCanaisVenda());
    const canalSalvo = todosCanais.find((c) => c.id === input.canalId);
    if (!canalSalvo) throw new Error(`Canal de venda "${input.canalId}" não encontrado.`);
    const canal = canalVendaParaDominio(canalSalvo);

    const regime = construirRegimeTributario(empresa);
    const dataReferencia = input.dataReferencia ? new Date(input.dataReferencia) : new Date();
    const resultadoRegime = regime.calcular(dataReferencia, new MemorialCalculo());

    const resultado = calcularMargemRealDadoPreco({
      precoMercado: Money.fromReais(input.precoMercado),
      custoDiretoUnitario,
      custosFixosPorPedidoUnitario: canal.totalTaxasFixasPorPedido(),
      percentualCustoFixo,
      percentualTributos: resultadoRegime.percentualSobreVenda,
      percentualCustosVariaveis: canal.percentualTotalSobreVenda(),
    });

    return {
      margemLiquidaReal: resultado.margemLiquidaReal.toNumber(),
      margemLiquidaRealFormatada: resultado.margemLiquidaReal.toDisplayString(),
      lucroLiquidoUnitario: resultado.lucroLiquidoUnitario.toJSON(),
      prejuizo: resultado.margemLiquidaReal.isNegative(),
      memorial: resultado.memorial,
      avisoLegal: 'Estimativa gerada automaticamente com base na legislação vigente na data de referência informada. Não substitui orientação de um contador.',
    };
  }
}
