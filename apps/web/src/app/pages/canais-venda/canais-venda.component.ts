import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CanalVenda } from '../../models/models';

@Component({
  selector: 'app-canais-venda',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './canais-venda.component.html',
})
export class CanaisVendaComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  canais: CanalVenda[] = [];
  editandoId: string | null = null;
  erro: string | null = null;

  form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    taxasPercentuais: this.fb.array([this.novaTaxaPercentual()]),
    taxasFixasPorPedido: this.fb.array([] as ReturnType<typeof this.novaTaxaFixa>[]),
  });

  get taxasPercentuais(): FormArray {
    return this.form.get('taxasPercentuais') as FormArray;
  }
  get taxasFixasPorPedido(): FormArray {
    return this.form.get('taxasFixasPorPedido') as FormArray;
  }

  novaTaxaPercentual() {
    return this.fb.nonNullable.group({ nome: ['', Validators.required], percentual: [0, [Validators.required, Validators.min(0), Validators.max(100)]] });
  }
  novaTaxaFixa() {
    return this.fb.nonNullable.group({ nome: ['', Validators.required], valorReais: [0, [Validators.required, Validators.min(0)]] });
  }

  adicionarTaxaPercentual(): void {
    this.taxasPercentuais.push(this.novaTaxaPercentual());
  }
  removerTaxaPercentual(i: number): void {
    this.taxasPercentuais.removeAt(i);
  }
  adicionarTaxaFixa(): void {
    this.taxasFixasPorPedido.push(this.novaTaxaFixa());
  }
  removerTaxaFixa(i: number): void {
    this.taxasFixasPorPedido.removeAt(i);
  }

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.api.listarCanaisVenda().subscribe((c) => (this.canais = c));
  }

  percentualTotal(c: CanalVenda): number {
    return c.taxasPercentuais.reduce((acc, t) => acc + t.percentual, 0);
  }

  editar(c: CanalVenda): void {
    this.editandoId = c.id;
    this.taxasPercentuais.clear();
    for (const t of c.taxasPercentuais) {
      this.taxasPercentuais.push(this.fb.nonNullable.group({ nome: [t.nome, Validators.required], percentual: [t.percentual, Validators.required] }));
    }
    if (!c.taxasPercentuais.length) this.taxasPercentuais.push(this.novaTaxaPercentual());
    this.taxasFixasPorPedido.clear();
    for (const t of c.taxasFixasPorPedido) {
      this.taxasFixasPorPedido.push(this.fb.nonNullable.group({ nome: [t.nome, Validators.required], valorReais: [t.valorReais, Validators.required] }));
    }
    this.form.patchValue({ nome: c.nome });
  }

  cancelar(): void {
    this.editandoId = null;
    this.taxasPercentuais.clear();
    this.taxasPercentuais.push(this.novaTaxaPercentual());
    this.taxasFixasPorPedido.clear();
    this.form.patchValue({ nome: '' });
  }

  salvar(): void {
    if (this.form.invalid) return;
    this.erro = null;
    const valor = this.form.getRawValue();
    const requisicao = this.editandoId ? this.api.atualizarCanalVenda(this.editandoId, valor) : this.api.criarCanalVenda(valor);
    requisicao.subscribe({
      next: () => {
        this.cancelar();
        this.carregar();
      },
      error: (err) => (this.erro = err?.error?.erro ?? 'Erro ao salvar canal de venda.'),
    });
  }

  remover(id: string): void {
    if (!confirm('Remover este canal de venda?')) return;
    this.api.removerCanalVenda(id).subscribe(() => this.carregar());
  }
}
