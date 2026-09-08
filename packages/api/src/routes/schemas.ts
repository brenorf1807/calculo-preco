import { z } from "zod";

export const historicoPrecoSchema = z.object({
  data: z.string(),
  precoCompraReais: z.number().nonnegative(),
});

export const insumoSchema = z.object({
  nome: z.string().min(1),
  categoria: z.enum(["materia_prima", "embalagem"]),
  unidadeCompra: z.string().min(1),
  precoCompraReais: z.number().positive(),
  quantidadeEmbalagem: z.number().positive(),
  unidadeConsumo: z.string().min(1),
  fatorConversao: z.number().positive(),
  percentualPerda: z.number().min(0).max(99.99),
  fornecedorId: z.string().optional(),
  historicoPrecos: z.array(historicoPrecoSchema).default([]),
});

export const itemFichaSchema = z.object({
  insumoId: z.string().min(1),
  quantidade: z.number().positive(),
});

export const fichaTecnicaSchema = z.object({
  nome: z.string().min(1),
  itens: z.array(itemFichaSchema).min(1),
  rendimento: z.number().positive(),
  tempoProducaoMinutos: z.number().nonnegative(),
});

export const despesaFixaSchema = z.object({
  nome: z.string().min(1),
  categoria: z.string().min(1),
  valorMensalReais: z.number().nonnegative(),
});

export const taxaPercentualSchema = z.object({
  nome: z.string().min(1),
  percentual: z.number().min(0).max(100),
});

export const taxaFixaPorPedidoSchema = z.object({
  nome: z.string().min(1),
  valorReais: z.number().nonnegative(),
});

export const canalVendaSchema = z.object({
  nome: z.string().min(1),
  taxasPercentuais: z.array(taxaPercentualSchema).default([]),
  taxasFixasPorPedido: z.array(taxaFixaPorPedidoSchema).default([]),
});

export const empresaSchema = z.object({
  regimeTributario: z.enum(["MEI", "SIMPLES_NACIONAL"]),
  anexoSimples: z.enum(["I", "III"]).optional(),
  rbt12Reais: z.number().nonnegative().optional(),
  dasMeiValorMensalReais: z.number().nonnegative().optional(),
  faturamentoAcumulado12MesesReais: z.number().nonnegative().optional(),
  margemLiquidaMinimaAlertaPercent: z.number().min(0).max(100).optional(),
});

export const calculoPrecoSchema = z.object({
  fichaTecnicaId: z.string().min(1),
  canalIds: z.array(z.string().min(1)).min(1),
  volumeEstimadoMensal: z.number().positive(),
  criterioRateio: z.enum(["volume", "tempo_producao"]).default("volume"),
  /** Só usado quando criterioRateio = "tempo_producao": volume mensal estimado dos DEMAIS produtos do mix, para ratear o custo fixo proporcionalmente ao tempo de produção de cada um. */
  mixParaRateioPorTempo: z
    .array(z.object({ fichaTecnicaId: z.string().min(1), volumeEstimadoMensal: z.number().positive() }))
    .optional(),
  custoMaoDeObra: z
    .object({
      modo: z.enum(["manual", "derivado"]),
      custoHoraReais: z.number().nonnegative().optional(),
      proLaboreDesejadoMensalReais: z.number().nonnegative().optional(),
      encargosMensaisReais: z.number().nonnegative().optional(),
      horasProdutivasMensais: z.number().positive().optional(),
    })
    .optional(),
  percentualMargemLiquidaDesejada: z.number().min(0).max(99.99),
  dataReferencia: z.string().optional(),
});

export const engenhariaReversaSchema = z.object({
  fichaTecnicaId: z.string().min(1),
  canalId: z.string().min(1),
  precoMercado: z.number().positive(),
  volumeEstimadoMensal: z.number().positive(),
  criterioRateio: z.enum(["volume", "tempo_producao"]).default("volume"),
  dataReferencia: z.string().optional(),
});
