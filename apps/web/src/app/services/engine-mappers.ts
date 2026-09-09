import { Decimal } from 'decimal.js';
import { Insumo as InsumoDominio, FichaTecnica as FichaTecnicaDominio, Money, Percentage, CanalVenda as CanalVendaDominio, UnidadeMedida } from '@calculo-preco/engine';
import { Insumo, FichaTecnica, CanalVenda } from '../models/models';

/**
 * Converte os documentos salvos no Firestore (formato JSON simples, sem
 * classes) para as entidades do motor de cálculo. Mesma responsabilidade
 * que existia em `packages/api/src/mappers.ts` antes de o backend Node ser
 * removido — só que agora roda no navegador.
 */
export function insumoParaDominio(insumo: Insumo): InsumoDominio {
  return new InsumoDominio({
    id: insumo.id,
    nome: insumo.nome,
    categoria: insumo.categoria,
    unidadeCompra: insumo.unidadeCompra as UnidadeMedida,
    precoCompra: Money.fromReais(insumo.precoCompraReais),
    quantidadeEmbalagem: new Decimal(insumo.quantidadeEmbalagem),
    unidadeConsumo: insumo.unidadeConsumo as UnidadeMedida,
    fatorConversao: new Decimal(insumo.fatorConversao),
    percentualPerda: Percentage.fromPercent(insumo.percentualPerda),
    fornecedorId: insumo.fornecedorId,
    historicoPrecos: insumo.historicoPrecos.map((h) => ({ data: new Date(h.data), precoCompra: Money.fromReais(h.precoCompraReais) })),
  });
}

export function fichaTecnicaParaDominio(ficha: FichaTecnica): FichaTecnicaDominio {
  return new FichaTecnicaDominio({
    id: ficha.id,
    nome: ficha.nome,
    itens: ficha.itens.map((i) => ({ insumoId: i.insumoId, quantidade: new Decimal(i.quantidade) })),
    rendimento: new Decimal(ficha.rendimento),
    tempoProducaoMinutos: new Decimal(ficha.tempoProducaoMinutos),
  });
}

export function canalVendaParaDominio(canal: CanalVenda): CanalVendaDominio {
  return new CanalVendaDominio({
    id: canal.id,
    nome: canal.nome,
    taxasPercentuais: canal.taxasPercentuais.map((t) => ({ nome: t.nome, percentual: Percentage.fromPercent(t.percentual) })),
    taxasFixasPorPedido: canal.taxasFixasPorPedido.map((t) => ({ nome: t.nome, valor: Money.fromReais(t.valorReais) })),
  });
}
