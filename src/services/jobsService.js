import { collection, doc, addDoc, setDoc, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from './firebase';

export const createJob = (data) => addDoc(collection(db, 'jobs'), { ...data, createdAt: new Date().toISOString() });

export async function listOpenJobs() {
  // sem orderBy no servidor (evita índice composto) — ordena em memória
  const snap = await getDocs(query(collection(db, 'jobs'), where('status', '==', 'open'), limit(100)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)); // destacados primeiro
}

export async function listMyJobs(companyId) {
  const snap = await getDocs(query(collection(db, 'jobs'), where('companyId', '==', companyId), limit(50)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

// candidatura: 1 por trabalhador por trabalho (doc id = uid)
export const applyToJob = (jobId, uid, data) =>
  setDoc(doc(db, 'jobs', jobId, 'applications', uid), { ...data, createdAt: new Date().toISOString() });

export async function listApplications(jobId) {
  const snap = await getDocs(collection(db, 'jobs', jobId, 'applications'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function myApplications(jobIds, uid) {
  const out = new Set();
  await Promise.all(jobIds.map(async (id) => {
    try {
      const s = await getDocs(query(collection(db, 'jobs', id, 'applications'), where('__name__', '==', uid)));
      if (!s.empty) out.add(id);
    } catch { /* sem acesso */ }
  }));
  return out;
}
