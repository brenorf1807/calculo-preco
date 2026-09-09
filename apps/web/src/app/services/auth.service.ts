import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut, UserCredential } from 'firebase/auth';
import { auth } from '../firebase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  /**
   * Observable "quente" (shareReplay) do usuário autenticado — todo mundo
   * que assina (guard, nav, serviços de dados) compartilha o mesmo listener
   * do Firebase em vez de abrir um novo a cada assinatura.
   */
  readonly currentUser$: Observable<User | null> = new Observable<User | null>((subscriber) => {
    return onAuthStateChanged(
      auth,
      (user) => subscriber.next(user),
      (err) => subscriber.error(err),
    );
  }).pipe(shareReplay({ bufferSize: 1, refCount: false }));

  login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(auth, email, password);
  }

  logout(): Promise<void> {
    return signOut(auth);
  }

  /** Uid do usuário logado. Só é chamado atrás do `authGuard`, então nunca deveria ser null aqui. */
  requireUid(): string {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error('Nenhum usuário autenticado — isto não deveria acontecer atrás do authGuard.');
    }
    return uid;
  }
}
