import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  erro: string | null = null;
  entrando = false;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
  });

  entrar(): void {
    if (this.form.invalid) return;
    this.erro = null;
    this.entrando = true;
    const { email, senha } = this.form.getRawValue();
    this.auth
      .login(email, senha)
      .then(() => this.router.navigateByUrl('/calculo'))
      .catch(() => {
        this.erro = 'E-mail ou senha inválidos.';
      })
      .finally(() => (this.entrando = false));
  }
}
