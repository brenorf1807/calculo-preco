import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { DespesaFixa } from '../../models/models';

@Component({
  selector: 'app-custos-fixos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './custos-fixos.component.html',
})
export class CustosFixosComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  despesas: DespesaFixa[] = [];
  editandoId: string | null = null;
  erro: string | null = null;

  form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    categoria: ['infraestrutura', Validators.required],
    valorMensalReais: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.carregar();
  }

  get totalMensal(): number {
    return this.despesas.reduce((acc, d) => acc + d.valorMensalReais, 0);
  }

  carregar(): void {
    this.api.listarCustosFixos().subscribe((d) => (this.despesas = d));
  }

  editar(d: DespesaFixa): void {
    this.editandoId = d.id;
    this.form.setValue({ nome: d.nome, categoria: d.categoria, valorMensalReais: d.valorMensalReais });
  }

  cancelar(): void {
    this.editandoId = null;
    this.form.reset({ nome: '', categoria: 'infraestrutura', valorMensalReais: 0 });
  }

  salvar(): void {
    if (this.form.invalid) return;
    this.erro = null;
    const valor = this.form.getRawValue();
    const requisicao = this.editandoId ? this.api.atualizarCustoFixo(this.editandoId, valor) : this.api.criarCustoFixo(valor);
    requisicao.subscribe({
      next: () => {
        this.cancelar();
        this.carregar();
      },
      error: (err) => (this.erro = err?.message ?? 'Erro ao salvar despesa fixa.'),
    });
  }

  remover(id: string): void {
    if (!confirm('Remover esta despesa fixa?')) return;
    this.api.removerCustoFixo(id).subscribe(() => this.carregar());
  }
}
