import { Decimal } from "decimal.js";
import {
  Insumo,
  FichaTecnica,
  Money,
  Percentage,
  CanalVenda,
  UnidadeMedida,
} from "@calculo-preco/engine";
import { InsumoRecord, FichaTecnicaRecord, CanalVendaRecord } from "./records/types.js";

export function insumoRecordToDomain(record: InsumoRecord): Insumo {
  return new Insumo({
    id: record.id,
    nome: record.nome,
    categoria: record.categoria,
    unidadeCompra: record.unidadeCompra as UnidadeMedida,
    precoCompra: Money.fromReais(record.precoCompraReais),
    quantidadeEmbalagem: new Decimal(record.quantidadeEmbalagem),
    unidadeConsumo: record.unidadeConsumo as UnidadeMedida,
    fatorConversao: new Decimal(record.fatorConversao),
    percentualPerda: Percentage.fromPercent(record.percentualPerda),
    fornecedorId: record.fornecedorId,
    historicoPrecos: record.historicoPrecos.map((h) => ({
      data: new Date(h.data),
      precoCompra: Money.fromReais(h.precoCompraReais),
    })),
  });
}

export function fichaTecnicaRecordToDomain(record: FichaTecnicaRecord): FichaTecnica {
  return new FichaTecnica({
    id: record.id,
    nome: record.nome,
    itens: record.itens.map((i) => ({ insumoId: i.insumoId, quantidade: new Decimal(i.quantidade) })),
    rendimento: new Decimal(record.rendimento),
    tempoProducaoMinutos: new Decimal(record.tempoProducaoMinutos),
  });
}

export function canalVendaRecordToDomain(record: CanalVendaRecord): CanalVenda {
  return new CanalVenda({
    id: record.id,
    nome: record.nome,
    taxasPercentuais: record.taxasPercentuais.map((t) => ({ nome: t.nome, percentual: Percentage.fromPercent(t.percentual) })),
    taxasFixasPorPedido: record.taxasFixasPorPedido.map((t) => ({ nome: t.nome, valor: Money.fromReais(t.valorReais) })),
  });
}
