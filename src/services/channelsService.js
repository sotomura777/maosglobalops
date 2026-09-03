import { collection, doc, setDoc, addDoc, getDocs, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

// Canais de tema fixos — criados de forma preguiçosa (id determinístico)
export const TOPIC_CHANNELS = [
  ['geral', '# geral'], ['porto', '# porto'], ['lisboa', '# lisboa'],
  ['bar-e-mesa', '# bar e mesa'], ['montagens', '# montagens'], ['ultima-hora', '# última hora'],
];

export const ensureTopicChannel = (slug, name) =>
  setDoc(doc(db, 'channels', `t-${slug}`), { type: 'topic', name, createdAt: new Date().toISOString() }, { merge: true });

// Canal da empresa: id determinístico c-{uid} — só a própria publica
export const ensureCompanyChannel = (uid, companyName) =>
  setDoc(doc(db, 'channels', `c-${uid}`), { type: 'company', name: companyName, companyId: uid, createdAt: new Date().toISOString() }, { merge: true });

export async function listChannels() {
  const snap = await getDocs(query(collection(db, 'channels'), limit(100)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.type === b.type ? (a.name || '').localeCompare(b.name || '') : a.type === 'topic' ? -1 : 1));
}

export const subscribePosts = (channelId, cb) =>
  onSnapshot(query(collection(db, 'channels', channelId, 'posts'), orderBy('createdAt', 'desc'), limit(50)),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse()), () => cb([]));

export const sendPost = (channelId, data) =>
  addDoc(collection(db, 'channels', channelId, 'posts'), { ...data, createdAt: new Date().toISOString() });
