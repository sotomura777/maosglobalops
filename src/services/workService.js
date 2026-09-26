import { collection, doc, addDoc, deleteDoc, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from './firebase';
import { listPublicProfiles } from './profileService';

// ── Registo de horas/ganhos do próprio trabalhador (privado) ──
export const addWorkEntry = (uid, data) =>
  addDoc(collection(db, 'profiles', uid, 'worklog'), { ...data, createdAt: new Date().toISOString() });

export const deleteWorkEntry = (uid, id) => deleteDoc(doc(db, 'profiles', uid, 'worklog', id));

export async function listWorkEntries(uid) {
  const snap = await getDocs(query(collection(db, 'profiles', uid, 'worklog'), limit(500)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

// ── Validações importadas pelo servidor (coleção de topo — alimenta o ranking) ──
export async function listValidationsFor(workerId) {
  const snap = await getDocs(query(collection(db, 'validations'), where('workerId', '==', workerId), limit(100)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}


// Compatibility for the unused legacy home page; never query all validations.
export async function listAllValidations() {
  const profiles = await listPublicProfiles();
  const result = [];
  for (let i = 0; i < profiles.length; i += 5) {
    const batch = await Promise.all(profiles.slice(i, i + 5).map(p => listValidationsFor(p.id).catch(() => [])));
    result.push(...batch.flat());
  }
  return result;
}
