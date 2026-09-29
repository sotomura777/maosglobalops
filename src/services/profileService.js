import {
  doc,
  runTransaction,
  serverTimestamp,
  collection,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore";
import { publicProfile } from "./publicProfile";
import { db } from "./firebase";

export const updateProfile = (uid, data) =>
  runTransaction(db, async (tx) => {
    const ref = doc(db, "profiles", uid);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Perfil indisponível");
    const next = {
      ...snap.data(),
      ...data,
      updatedAt: new Date().toISOString(),
    };
    tx.update(ref, { ...data, updatedAt: next.updatedAt });
    tx.set(doc(db, "publicProfiles", uid), publicProfile(next));
  });

// Diretório: perfis públicos (o dono controla a visibilidade)
export async function listPublicProfiles() {
  const snap = await getDocs(
    query(
      collection(db, "publicProfiles"),
      where("public", "==", true),
      limit(200),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Link público (/p/nome). O nome fica reservado para a pessoa em handles/{nome}.
export const claimHandle = (uid, slug) =>
  runTransaction(db, async (tx) => {
    const ref = doc(db, "profiles", uid);
    const handleRef = doc(db, "handles", slug);
    const [snap, taken] = await Promise.all([tx.get(ref), tx.get(handleRef)]);
    if (!snap.exists()) throw new Error("Perfil indisponível.");
    if (taken.exists() && taken.data().uid !== uid)
      throw new Error("Esse nome já está a ser usado. Experimenta outro.");
    const current = snap.data();
    if (current.public !== true)
      throw new Error("Torna o perfil visível antes de criar o link público.");
    const next = { ...current, handle: slug, updatedAt: new Date().toISOString() };
    if (!taken.exists()) tx.set(handleRef, { uid, createdAt: serverTimestamp() });
    tx.update(ref, { handle: slug, updatedAt: next.updatedAt });
    tx.set(doc(db, "publicProfiles", uid), publicProfile(next));
    if (current.handle && current.handle !== slug) tx.delete(doc(db, "handles", current.handle));
  });
export const releaseHandle = (uid) =>
  runTransaction(db, async (tx) => {
    const ref = doc(db, "profiles", uid);
    const snap = await tx.get(ref);
    const current = snap.data();
    if (!current?.handle) return;
    const next = { ...current, handle: "", updatedAt: new Date().toISOString() };
    tx.update(ref, { handle: "", updatedAt: next.updatedAt });
    tx.set(doc(db, "publicProfiles", uid), publicProfile(next));
    tx.delete(doc(db, "handles", current.handle));
  });
