import { doc, updateDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export const updateProfile = (uid, data) =>
  updateDoc(doc(db, 'profiles', uid), { ...data, updatedAt: new Date().toISOString() });

// Diretório: perfis públicos (o dono controla a visibilidade)
export async function listPublicProfiles() {
  const snap = await getDocs(query(collection(db, 'profiles'), where('public', '==', true), limit(200)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
