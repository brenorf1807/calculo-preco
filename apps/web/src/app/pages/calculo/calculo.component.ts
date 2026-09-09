import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { PricingService } from '../../services/pricing.service';
import { FichaTecnica, Insumo, CanalVenda, ResultadoPrecoPorCanalDTO } from '../../models/models';

interface SegmentoComposicao {
  chave: string;
  rotulo: string;
  valor: number;
  percentual: number;
  cor: string;
}

const CORES: Record<string, string> = {
  materiaPrima: '#4c6ef5',
  embalagem: '#91a7ff',
  maoDeObra: '#f59f00',
  custoFixoRateado: '#adb5bd',
  taxasFixasPorPedido: '#868e96',
  tributos: '#e03131',
  custosVariaveisCanal: '#f76707',
  lucroLiquido: '#2f9e44',
};

const ROTULOS: Record<string, string> = {
  materiaPrima: 'Matéria-prima',
  embalagem: 'Embalagem',
  maoDeObra: 'Mão de obra',
  custoFixoRateado: 'Custo fixo rateado',
  taxasFixasPorPedido: 'Taxa fixa/pedido',
  tributos: 'Tributos',
  custosVariaveisCanal: 'Taxas do canal',
  lucroLiquido: 'Lucro líquido',
};

@Component({
  selector: 'app-calculo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './calculo.component.html',
})
export class CalculoComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly pricing = inject(PricingService);
  private readonly fb = inject(FormBuilder);

  fichas: FichaTecnica[] = [];
  insumos: Insumo[] = [];
  canais: CanalVenda[] = [];
  resultados: ResultadoPrecoPorCanalDTO[] | null = null;
  erro: string | null = null;
  carregando = false;
  memorialAbertoPara: string | null = null;

  form = this.fb.nonNullable.group({
    modoProduto: ['ficha' as 'ficha' | 'insumo', Validators.required],
    fichaTecnicaId: [''],
    insumoId: [''],
    quantidadePorUnidade: [1, [Validators.min(0.0001)]],
    canalIds: this.fb.nonNullable.control<string[]>([]),
    volumeEstimadoMensal: [100, [Validators.required, Validators.min(1)]],
    criterioRateio: ['volume' as 'volume' | 'tempo_producao', Validators.required],
    percentualMargemLiquidaDesejada: [15, [Validators.required, Validators.min(0), Validators.max(99.99)]],
    incluirMaoDeObra: [false],
    custoHoraReais: [20, Validators.min(0)],
  });

  get modoInsumo(): boolean {
    return this.form.controls.modoProduto.value === 'insumo';
  }

  unidadeConsumoDoInsumo(insumoId: string): string {
    return this.insumos.find((i) => i.id === insumoId)?.unidadeConsumo ?? '';
  }

  ngOnInit(): void {
    this.api.listarFichasTecnicas().subscribe((f) => (this.fichas = f));
    this.api.listarInsumos().subscribe((i) => (this.insumos = i));
    this.api.listarCanaisVenda().subscribe((c) => (this.canais = c));
  }

  alternarCanal(canalId: string, marcado: boolean): void {
    const atual = this.form.controls.canalIds.value;
    this.form.controls.canalIds.setValue(marcado ? [...atual, canalId] : atual.filter((id) => id !== canalId));
  }

  canalMarcado(canalId: string): boolean {
    return this.form.controls.canalIds.value.includes(canalId);
  }

  calcular(): void {
    const v = this.form.getRawValue();
    const produtoValido = v.modoProduto === 'insumo' ? !!v.insumoId : !!v.fichaTecnicaId;
    if (this.form.invalid || !produtoValido || v.canalIds.length === 0) {
      this.erro =
        v.modoProduto === 'insumo'
          ? 'Selecione o insumo e ao menos um canal de venda.'
          : 'Selecione a ficha técnica e ao menos um canal de venda.';
      return;
    }
    this.erro = null;
    this.carregando = true;
    this.resultados = null;
    this.pricing
      .calcularPreco({
        fichaTecnicaId: v.modoProduto === 'ficha' ? v.fichaTecnicaId : undefined,
        insumoId: v.modoProduto === 'insumo' ? v.insumoId : undefined,
        quantidadePorUnidade: v.modoProduto === 'insumo' ? v.quantidadePorUnidade : undefined,
        canalIds: v.canalIds,
        volumeEstimadoMensal: v.volumeEstimadoMensal,
        criterioRateio: v.criterioRateio,
        percentualMargemLiquidaDesejada: v.percentualMargemLiquidaDesejada,
        custoMaoDeObra: v.incluirMaoDeObra ? { modo: 'manual', custoHoraReais: v.custoHoraReais } : undefined,
      })
      .subscribe({
        next: (resultados) => {
          this.resultados = resultados;
          this.carregando = false;
        },
        error: (err) => {
          this.erro = err?.message ?? 'Erro ao calcular preço.';
          this.carregando = false;
        },
      });
  }

  segmentos(resultado: ResultadoPrecoPorCanalDTO): SegmentoComposicao[] {
    const entradas = Object.entries(resultado.composicao) as [string, number][];
    const total = entradas.reduce((acc, [, valor]) => acc + Math.max(valor, 0), 0);
    if (total <= 0) return [];
    return entradas
      .filter(([, valor]) => valor > 0)
      .map(([chave, valor]) => ({
        chave,
        rotulo: ROTULOS[chave] ?? chave,
        valor,
        percentual: (valor / total) * 100,
        cor: CORES[chave] ?? '#ccc',
      }));
  }

  alternarMemorial(canalId: string): void {
    this.memorialAbertoPara = this.memorialAbertoPara === canalId ? null : canalId;
  }
}
