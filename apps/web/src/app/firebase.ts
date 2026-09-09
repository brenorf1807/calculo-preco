import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Config do app web do Firebase — NÃO é segredo: é normal e esperado que
 * ela vá para o bundle do navegador (é assim que o SDK do Firebase sabe a
 * qual projeto conectar). A segurança real vem do Firebase Authentication
 * + das regras do Firestore (`firestore.rules`), não de esconder isto.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyDWkChaGvz1eyCOCA3A82OSGgGCSpe9bGo',
  authDomain: 'precificando-eb48f.firebaseapp.com',
  projectId: 'precificando-eb48f',
  storageBucket: 'precificando-eb48f.firebasestorage.app',
  messagingSenderId: '290484564356',
  appId: '1:290484564356:web:5ef0cf9b7d106b81112dd1',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
