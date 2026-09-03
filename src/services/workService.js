import { collection, doc, addDoc, deleteDoc, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from './firebase';

// ── Registo de horas/ganhos do próprio trabalhador (privado) ──
export const addWorkEntry = (uid, data) =>
  addDoc(collection(db, 'profiles', uid, 'worklog'), { ...data, createdAt: new Date().toISOString() });

export const deleteWorkEntry = (uid, id) => deleteDoc(doc(db, 'profiles', uid, 'worklog', id));

export async function listWorkEntries(uid) {
  const snap = await getDocs(query(collection(db, 'profiles', uid, 'worklog'), limit(500)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

// ── Validações feitas por empresas (coleção de topo — alimenta o ranking) ──
export const createValidation = (data) =>
  addDoc(collection(db, 'validations'), { ...data, createdAt: new Date().toISOString() });

export async function listValidationsFor(workerId) {
  const snap = await getDocs(query(collection(db, 'validations'), where('workerId', '==', workerId), limit(100)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listAllValidations() {
  const snap = await getDocs(query(collection(db, 'validations'), limit(1000)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
