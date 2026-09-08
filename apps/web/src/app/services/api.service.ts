import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import {
  Insumo,
  FichaTecnica,
  DespesaFixa,
  CanalVenda,
  Empresa,
  CalculoPrecoRequest,
  ResultadoPrecoPorCanalDTO,
  EngenhariaReversaRequest,
  EngenhariaReversaResultado,
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  // Insumos
  listarInsumos(): Observable<Insumo[]> {
    return this.http.get<Insumo[]>(`${API_BASE_URL}/insumos`);
  }
  criarInsumo(insumo: Omit<Insumo, 'id'>): Observable<Insumo> {
    return this.http.post<Insumo>(`${API_BASE_URL}/insumos`, insumo);
  }
  atualizarInsumo(id: string, insumo: Omit<Insumo, 'id'>): Observable<Insumo> {
    return this.http.put<Insumo>(`${API_BASE_URL}/insumos/${id}`, insumo);
  }
  removerInsumo(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/insumos/${id}`);
  }

  // Fichas técnicas
  listarFichasTecnicas(): Observable<FichaTecnica[]> {
    return this.http.get<FichaTecnica[]>(`${API_BASE_URL}/fichas-tecnicas`);
  }
  criarFichaTecnica(ficha: Omit<FichaTecnica, 'id'>): Observable<FichaTecnica> {
    return this.http.post<FichaTecnica>(`${API_BASE_URL}/fichas-tecnicas`, ficha);
  }
  atualizarFichaTecnica(id: string, ficha: Omit<FichaTecnica, 'id'>): Observable<FichaTecnica> {
    return this.http.put<FichaTecnica>(`${API_BASE_URL}/fichas-tecnicas/${id}`, ficha);
  }
  removerFichaTecnica(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/fichas-tecnicas/${id}`);
  }

  // Custos fixos
  listarCustosFixos(): Observable<DespesaFixa[]> {
    return this.http.get<DespesaFixa[]>(`${API_BASE_URL}/custos-fixos`);
  }
  criarCustoFixo(despesa: Omit<DespesaFixa, 'id'>): Observable<DespesaFixa> {
    return this.http.post<DespesaFixa>(`${API_BASE_URL}/custos-fixos`, despesa);
  }
  atualizarCustoFixo(id: string, despesa: Omit<DespesaFixa, 'id'>): Observable<DespesaFixa> {
    return this.http.put<DespesaFixa>(`${API_BASE_URL}/custos-fixos/${id}`, despesa);
  }
  removerCustoFixo(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/custos-fixos/${id}`);
  }

  // Canais de venda
  listarCanaisVenda(): Observable<CanalVenda[]> {
    return this.http.get<CanalVenda[]>(`${API_BASE_URL}/canais-venda`);
  }
  criarCanalVenda(canal: Omit<CanalVenda, 'id'>): Observable<CanalVenda> {
    return this.http.post<CanalVenda>(`${API_BASE_URL}/canais-venda`, canal);
  }
  atualizarCanalVenda(id: string, canal: Omit<CanalVenda, 'id'>): Observable<CanalVenda> {
    return this.http.put<CanalVenda>(`${API_BASE_URL}/canais-venda/${id}`, canal);
  }
  removerCanalVenda(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/canais-venda/${id}`);
  }

  // Empresa
  obterEmpresa(): Observable<Empresa> {
    return this.http.get<Empresa>(`${API_BASE_URL}/empresa`);
  }
  salvarEmpresa(empresa: Empresa): Observable<Empresa> {
    return this.http.put<Empresa>(`${API_BASE_URL}/empresa`, empresa);
  }

  // Cálculo
  calcularPreco(request: CalculoPrecoRequest): Observable<ResultadoPrecoPorCanalDTO[]> {
    return this.http.post<ResultadoPrecoPorCanalDTO[]>(`${API_BASE_URL}/calculo/preco`, request);
  }
  calcularEngenhariaReversa(request: EngenhariaReversaRequest): Observable<EngenhariaReversaResultado> {
    return this.http.post<EngenhariaReversaResultado>(`${API_BASE_URL}/calculo/engenharia-reversa`, request);
  }
}
