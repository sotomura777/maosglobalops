import {
  doc,
  runTransaction,
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
