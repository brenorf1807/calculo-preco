import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Insumo } from '../../models/models';

@Component({
  selector: 'app-insumos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './insumos.component.html',
})
export class InsumosComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  insumos: Insumo[] = [];
  editandoId: string | null = null;
  erro: string | null = null;

  form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    categoria: ['materia_prima' as 'materia_prima' | 'embalagem', Validators.required],
    unidadeCompra: ['kg', Validators.required],
    precoCompraReais: [0, [Validators.required, Validators.min(0.01)]],
    quantidadeEmbalagem: [1, [Validators.required, Validators.min(0.0001)]],
    unidadeConsumo: ['g', Validators.required],
    fatorConversao: [1000, [Validators.required, Validators.min(0.0001)]],
    percentualPerda: [0, [Validators.min(0), Validators.max(99.99)]],
  });

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.api.listarInsumos().subscribe((insumos) => (this.insumos = insumos));
  }

  editar(insumo: Insumo): void {
    this.editandoId = insumo.id;
    this.form.setValue({
      nome: insumo.nome,
      categoria: insumo.categoria,
      unidadeCompra: insumo.unidadeCompra,
      precoCompraReais: insumo.precoCompraReais,
      quantidadeEmbalagem: insumo.quantidadeEmbalagem,
      unidadeConsumo: insumo.unidadeConsumo,
      fatorConversao: insumo.fatorConversao,
      percentualPerda: insumo.percentualPerda,
    });
  }

  cancelar(): void {
    this.editandoId = null;
    this.form.reset({
      nome: '',
      categoria: 'materia_prima',
      unidadeCompra: 'kg',
      precoCompraReais: 0,
      quantidadeEmbalagem: 1,
      unidadeConsumo: 'g',
      fatorConversao: 1000,
      percentualPerda: 0,
    });
  }

  salvar(): void {
    if (this.form.invalid) return;
    this.erro = null;
    const valor = { ...this.form.getRawValue(), historicoPrecos: [] };
    const requisicao = this.editandoId
      ? this.api.atualizarInsumo(this.editandoId, valor)
      : this.api.criarInsumo(valor);
    requisicao.subscribe({
      next: () => {
        this.cancelar();
        this.carregar();
      },
      error: (err) => (this.erro = err?.error?.erro ?? 'Erro ao salvar insumo.'),
    });
  }

  remover(id: string): void {
    if (!confirm('Remover este insumo?')) return;
    this.api.removerInsumo(id).subscribe(() => this.carregar());
  }

  custoUnitarioEstimado(i: Insumo): number {
    const custoPorUnidadeCompra = i.precoCompraReais / i.quantidadeEmbalagem;
    const custoBruto = custoPorUnidadeCompra / i.fatorConversao;
    return custoBruto / (1 - i.percentualPerda / 100);
  }
}
