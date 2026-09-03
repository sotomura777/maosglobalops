import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// Registo de trabalhador: conta + perfil mínimo (kind worker)
export async function signUpWorker(email, password, name) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  try {
    await setDoc(doc(db, 'profiles', cred.user.uid), {
      kind: 'worker', name, email, gdprConsent: true, createdAt: new Date().toISOString(),
    });
  } catch (e) {
    await cred.user.delete().catch(() => {}); // não deixar conta órfã sem perfil
    throw e;
  }
  return cred.user;
}

export const signIn = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const signOut = () => fbSignOut(auth);
export const watchAuth = (cb) => onAuthStateChanged(auth, cb);
export const getProfile = async (uid) => {
  const s = await getDoc(doc(db, 'profiles', uid));
  return s.exists() ? { id: s.id, ...s.data() } : null;
};
