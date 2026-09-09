import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { FichaTecnica, Insumo } from '../../models/models';

@Component({
  selector: 'app-fichas-tecnicas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './fichas-tecnicas.component.html',
})
export class FichasTecnicasComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  fichas: FichaTecnica[] = [];
  insumos: Insumo[] = [];
  editandoId: string | null = null;
  erro: string | null = null;

  form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    rendimento: [1, [Validators.required, Validators.min(1)]],
    tempoProducaoMinutos: [0, [Validators.required, Validators.min(0)]],
    itens: this.fb.array([this.novoItem()]),
  });

  get itens(): FormArray {
    return this.form.get('itens') as FormArray;
  }

  novoItem() {
    return this.fb.nonNullable.group({
      insumoId: ['', Validators.required],
      quantidade: [1, [Validators.required, Validators.min(0.0001)]],
    });
  }

  adicionarItem(): void {
    this.itens.push(this.novoItem());
  }

  removerItem(index: number): void {
    if (this.itens.length > 1) this.itens.removeAt(index);
  }

  ngOnInit(): void {
    this.api.listarInsumos().subscribe((insumos) => (this.insumos = insumos));
    this.carregar();
  }

  carregar(): void {
    this.api.listarFichasTecnicas().subscribe((fichas) => (this.fichas = fichas));
  }

  nomeInsumo(id: string): string {
    return this.insumos.find((i) => i.id === id)?.nome ?? '(insumo removido)';
  }

  editar(ficha: FichaTecnica): void {
    this.editandoId = ficha.id;
    this.itens.clear();
    for (const item of ficha.itens) {
      this.itens.push(this.fb.nonNullable.group({ insumoId: [item.insumoId, Validators.required], quantidade: [item.quantidade, Validators.required] }));
    }
    this.form.patchValue({ nome: ficha.nome, rendimento: ficha.rendimento, tempoProducaoMinutos: ficha.tempoProducaoMinutos });
  }

  cancelar(): void {
    this.editandoId = null;
    this.itens.clear();
    this.itens.push(this.novoItem());
    this.form.patchValue({ nome: '', rendimento: 1, tempoProducaoMinutos: 0 });
  }

  salvar(): void {
    if (this.form.invalid) return;
    this.erro = null;
    const valor = this.form.getRawValue();
    const requisicao = this.editandoId ? this.api.atualizarFichaTecnica(this.editandoId, valor) : this.api.criarFichaTecnica(valor);
    requisicao.subscribe({
      next: () => {
        this.cancelar();
        this.carregar();
      },
      error: (err) => (this.erro = err?.message ?? 'Erro ao salvar ficha técnica.'),
    });
  }

  remover(id: string): void {
    if (!confirm('Remover esta ficha técnica?')) return;
    this.api.removerFichaTecnica(id).subscribe(() => this.carregar());
  }
}
