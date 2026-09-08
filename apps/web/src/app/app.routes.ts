import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'calculo', pathMatch: 'full' },
  { path: 'calculo', loadComponent: () => import('./pages/calculo/calculo.component').then((m) => m.CalculoComponent) },
  { path: 'insumos', loadComponent: () => import('./pages/insumos/insumos.component').then((m) => m.InsumosComponent) },
  {
    path: 'fichas-tecnicas',
    loadComponent: () => import('./pages/fichas-tecnicas/fichas-tecnicas.component').then((m) => m.FichasTecnicasComponent),
  },
  {
    path: 'custos-fixos',
    loadComponent: () => import('./pages/custos-fixos/custos-fixos.component').then((m) => m.CustosFixosComponent),
  },
  {
    path: 'canais-venda',
    loadComponent: () => import('./pages/canais-venda/canais-venda.component').then((m) => m.CanaisVendaComponent),
  },
  { path: 'empresa', loadComponent: () => import('./pages/empresa/empresa.component').then((m) => m.EmpresaComponent) },
];
