import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-empresa',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './empresa.component.html',
})
export class EmpresaComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  erro: string | null = null;
  salvo = false;

  form = this.fb.nonNullable.group({
    regimeTributario: ['MEI' as 'MEI' | 'SIMPLES_NACIONAL', Validators.required],
    anexoSimples: ['I' as 'I' | 'III'],
    rbt12Reais: [0, Validators.min(0)],
    dasMeiValorMensalReais: [76.9, Validators.min(0)],
    faturamentoAcumulado12MesesReais: [0, Validators.min(0)],
    margemLiquidaMinimaAlertaPercent: [10, [Validators.min(0), Validators.max(100)]],
  });

  ngOnInit(): void {
    this.api.obterEmpresa().subscribe({
      next: (empresa) =>
        this.form.patchValue({
          regimeTributario: empresa.regimeTributario,
          anexoSimples: empresa.anexoSimples ?? 'I',
          rbt12Reais: empresa.rbt12Reais ?? 0,
          dasMeiValorMensalReais: empresa.dasMeiValorMensalReais ?? 76.9,
          faturamentoAcumulado12MesesReais: empresa.faturamentoAcumulado12MesesReais ?? 0,
          margemLiquidaMinimaAlertaPercent: empresa.margemLiquidaMinimaAlertaPercent ?? 10,
        }),
      error: () => {
        /* empresa ainda não configurada — mantém os valores padrão do formulário */
      },
    });
  }

  salvar(): void {
    if (this.form.invalid) return;
    this.erro = null;
    this.salvo = false;
    this.api.salvarEmpresa(this.form.getRawValue()).subscribe({
      next: () => (this.salvo = true),
      error: (err) => (this.erro = err?.error?.erro ?? 'Erro ao salvar dados da empresa.'),
    });
  }
}
