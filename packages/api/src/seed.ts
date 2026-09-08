import { randomUUID } from "node:crypto";
import { insumoRepository, fichaTecnicaRepository, despesaFixaRepository, canalVendaRepository, empresaStore } from "./repositories/store.js";

/**
 * Dados de demonstração para o app funcionar "out of the box" na primeira
 * execução. Controlado por SEED_DEMO_DATA=false para desligar (ex.: quando
 * o Firestore substituir o repositório em memória, isso não deve rodar).
 */
export async function seedDemoData(): Promise<void> {
  if (process.env.SEED_DEMO_DATA === "false") return;
  if ((await insumoRepository.list()).length > 0) return;

  const farinhaId = randomUUID();
  const acucarId = randomUUID();
  const embalagemId = randomUUID();

  await insumoRepository.create({
    id: farinhaId,
    nome: "Farinha de trigo",
    categoria: "materia_prima",
    unidadeCompra: "kg",
    precoCompraReais: 6.5,
    quantidadeEmbalagem: 5,
    unidadeConsumo: "g",
    fatorConversao: 1000,
    percentualPerda: 3,
    historicoPrecos: [],
  });
  await insumoRepository.create({
    id: acucarId,
    nome: "Açúcar refinado",
    categoria: "materia_prima",
    unidadeCompra: "kg",
    precoCompraReais: 4.2,
    quantidadeEmbalagem: 5,
    unidadeConsumo: "g",
    fatorConversao: 1000,
    percentualPerda: 0,
    historicoPrecos: [],
  });
  await insumoRepository.create({
    id: embalagemId,
    nome: "Pote 500ml com tampa",
    categoria: "embalagem",
    unidadeCompra: "unidade",
    precoCompraReais: 1.2,
    quantidadeEmbalagem: 1,
    unidadeConsumo: "unidade",
    fatorConversao: 1,
    percentualPerda: 0,
    historicoPrecos: [],
  });

  const fichaId = randomUUID();
  await fichaTecnicaRepository.create({
    id: fichaId,
    nome: "Bolo de pote (demo)",
    itens: [
      { insumoId: farinhaId, quantidade: 3000 },
      { insumoId: acucarId, quantidade: 1500 },
      { insumoId: embalagemId, quantidade: 24 },
    ],
    rendimento: 24,
    tempoProducaoMinutos: 90,
  });

  await despesaFixaRepository.create({
    id: randomUUID(),
    nome: "Aluguel do espaço",
    categoria: "infraestrutura",
    valorMensalReais: 800,
  });
  await despesaFixaRepository.create({
    id: randomUUID(),
    nome: "Internet + telefone",
    categoria: "infraestrutura",
    valorMensalReais: 120,
  });
  await despesaFixaRepository.create({
    id: randomUUID(),
    nome: "Contador",
    categoria: "serviços",
    valorMensalReais: 180,
  });

  await canalVendaRepository.create({
    id: randomUUID(),
    nome: "Loja própria / WhatsApp (Pix)",
    taxasPercentuais: [{ nome: "Provisão de inadimplência", percentual: 1 }],
    taxasFixasPorPedido: [],
  });
  await canalVendaRepository.create({
    id: randomUUID(),
    nome: "Cartão de crédito (maquininha)",
    taxasPercentuais: [
      { nome: "Taxa da maquininha", percentual: 4.5 },
      { nome: "Provisão de inadimplência", percentual: 1 },
    ],
    taxasFixasPorPedido: [],
  });
  await canalVendaRepository.create({
    id: randomUUID(),
    nome: "Marketplace (ex.: iFood)",
    taxasPercentuais: [
      { nome: "Comissão do marketplace", percentual: 15 },
      { nome: "Taxa de pagamento", percentual: 3.5 },
    ],
    taxasFixasPorPedido: [{ nome: "Taxa fixa por pedido", valorReais: 2 }],
  });

  empresaStore.set({
    regimeTributario: "MEI",
    dasMeiValorMensalReais: 76.9,
    faturamentoAcumulado12MesesReais: 40000,
    margemLiquidaMinimaAlertaPercent: 10,
  });

  // eslint-disable-next-line no-console
  console.log("[seed] Dados de demonstração carregados (MEI, bolo de pote, 3 canais de venda).");
}
