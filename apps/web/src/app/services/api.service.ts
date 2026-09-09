import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import {
  CollectionReference,
  DocumentData,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { AuthService } from './auth.service';
import { Insumo, FichaTecnica, DespesaFixa, CanalVenda, Empresa } from '../models/models';

/**
 * Sem backend: este serviço fala direto com o Firestore. Os dados de cada
 * usuário ficam isolados em `users/{uid}/<colecao>` — a mesma separação que
 * `firestore.rules` (na raiz do projeto) usa para negar acesso entre
 * usuários. Mantém a MESMA interface pública do antigo `ApiService` baseado
 * em HTTP, então as telas (insumos, fichas técnicas etc.) não mudaram nada.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly auth = inject(AuthService);

  private colecao<T extends DocumentData>(nome: string): CollectionReference<T> {
    return collection(db, 'users', this.auth.requireUid(), nome) as CollectionReference<T>;
  }

  private async listarColecao<T extends { id: string }>(nome: string): Promise<T[]> {
    const snap = await getDocs(this.colecao<DocumentData>(nome));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
  }

  private async criarNaColecao<T extends { id: string }>(nome: string, dados: Omit<T, 'id'>): Promise<T> {
    const ref = doc(this.colecao<DocumentData>(nome));
    await setDoc(ref, dados);
    return { id: ref.id, ...dados } as T;
  }

  private async atualizarNaColecao<T extends { id: string }>(nome: string, id: string, dados: Omit<T, 'id'>): Promise<T> {
    await setDoc(doc(this.colecao<DocumentData>(nome), id), dados);
    return { id, ...dados } as T;
  }

  private async removerDaColecao(nome: string, id: string): Promise<void> {
    await deleteDoc(doc(this.colecao<DocumentData>(nome), id));
  }

  // Insumos
  listarInsumos(): Observable<Insumo[]> {
    return from(this.listarColecao<Insumo>('insumos'));
  }
  criarInsumo(insumo: Omit<Insumo, 'id'>): Observable<Insumo> {
    return from(this.criarNaColecao<Insumo>('insumos', insumo));
  }
  atualizarInsumo(id: string, insumo: Omit<Insumo, 'id'>): Observable<Insumo> {
    return from(this.atualizarNaColecao<Insumo>('insumos', id, insumo));
  }
  removerInsumo(id: string): Observable<void> {
    return from(this.removerDaColecao('insumos', id));
  }

  // Fichas técnicas
  listarFichasTecnicas(): Observable<FichaTecnica[]> {
    return from(this.listarColecao<FichaTecnica>('fichasTecnicas'));
  }
  criarFichaTecnica(ficha: Omit<FichaTecnica, 'id'>): Observable<FichaTecnica> {
    return from(this.criarNaColecao<FichaTecnica>('fichasTecnicas', ficha));
  }
  atualizarFichaTecnica(id: string, ficha: Omit<FichaTecnica, 'id'>): Observable<FichaTecnica> {
    return from(this.atualizarNaColecao<FichaTecnica>('fichasTecnicas', id, ficha));
  }
  removerFichaTecnica(id: string): Observable<void> {
    return from(this.removerDaColecao('fichasTecnicas', id));
  }

  // Custos fixos
  listarCustosFixos(): Observable<DespesaFixa[]> {
    return from(this.listarColecao<DespesaFixa>('despesasFixas'));
  }
  criarCustoFixo(despesa: Omit<DespesaFixa, 'id'>): Observable<DespesaFixa> {
    return from(this.criarNaColecao<DespesaFixa>('despesasFixas', despesa));
  }
  atualizarCustoFixo(id: string, despesa: Omit<DespesaFixa, 'id'>): Observable<DespesaFixa> {
    return from(this.atualizarNaColecao<DespesaFixa>('despesasFixas', id, despesa));
  }
  removerCustoFixo(id: string): Observable<void> {
    return from(this.removerDaColecao('despesasFixas', id));
  }

  // Canais de venda
  listarCanaisVenda(): Observable<CanalVenda[]> {
    return from(this.listarColecao<CanalVenda>('canaisVenda'));
  }
  criarCanalVenda(canal: Omit<CanalVenda, 'id'>): Observable<CanalVenda> {
    return from(this.criarNaColecao<CanalVenda>('canaisVenda', canal));
  }
  atualizarCanalVenda(id: string, canal: Omit<CanalVenda, 'id'>): Observable<CanalVenda> {
    return from(this.atualizarNaColecao<CanalVenda>('canaisVenda', id, canal));
  }
  removerCanalVenda(id: string): Observable<void> {
    return from(this.removerDaColecao('canaisVenda', id));
  }

  // Empresa — documento único por usuário: users/{uid}/empresa/config
  obterEmpresa(): Observable<Empresa> {
    return from(
      (async () => {
        const ref = doc(db, 'users', this.auth.requireUid(), 'empresa', 'config');
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error('Empresa ainda não configurada.');
        return snap.data() as Empresa;
      })(),
    );
  }
  salvarEmpresa(empresa: Empresa): Observable<Empresa> {
    return from(
      (async () => {
        const ref = doc(db, 'users', this.auth.requireUid(), 'empresa', 'config');
        await setDoc(ref, empresa);
        return empresa;
      })(),
    );
  }
}
