import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  setDoc,
  updateDoc,
  runTransaction,
  serverTimestamp,
  orderBy,
  limit,
  deleteDoc,
} from "firebase/firestore";
import { db, functions, auth } from "../services/firebase";
import { httpsCallable } from "firebase/functions";
const contracting = httpsCallable(functions, "contracting");
const administration = httpsCallable(functions, "admin");
const accountRights = httpsCallable(functions, "account");
async function contract(data, callable = contracting) {
  try {
    await auth.currentUser?.getIdToken(true);
    return (await callable(data)).data;
  } catch (e) {
    throw new Error(
      e.code === "functions/unavailable"
        ? "O serviço está temporariamente indisponível. Tenta novamente."
        : e.message || "Não foi possível guardar.",
    );
  }
}
import { timestampMillis } from "./model";
const rows = (s) => s.docs.map((d) => ({ ...d.data(), id: d.id }));
// As 100 ofertas abertas mais recentes: limita leituras (e custo) quando o volume crescer.
export const watchJobs = (cb, err) =>
  onSnapshot(
    query(
      collection(db, "jobs"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc"),
      limit(100),
    ),
    (s) => cb(rows(s)),
    err,
  );
export const watchOwnJobs = (uid, cb, err) =>
  onSnapshot(
    query(collection(db, "jobs"), where("companyId", "==", uid)),
    (s) => cb(rows(s)),
    err,
  );
export const watchApplications = (uid, company, cb, err) =>
  onSnapshot(
    query(
      collection(db, "engagements"),
      where(company ? "companyId" : "workerId", "==", uid),
    ),
    (s) =>
      cb(
        rows(s).sort(
          (a, b) => timestampMillis(b.updatedAt) - timestampMillis(a.updatedAt),
        ),
      ),
    err,
  );
export const watchMessages = (id, cb, err) =>
  onSnapshot(
    query(
      collection(db, "engagements", id, "messages"),
      orderBy("createdAt", "desc"),
      limit(100),
    ),
    (s) => cb(rows(s).reverse()),
    err,
  );
export async function apply(job, user, profile, message) {
  return contract({
    operation: "apply",
    jobId: job.id,
    message: message.trim(),
  });
}
export async function transition(a, next, uid, note = "", extra = {}) {
  return contract({
    operation: "transition",
    id: a.id,
    expected: a.status,
    next,
    note: note.trim(),
    ...extra,
  });
}
export async function sendMessage(a, uid, text) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, "engagements", a.id);
    await tx.get(ref);
    tx.set(doc(collection(ref, "messages")), {
      senderId: uid,
      text: text.trim(),
      createdAt: serverTimestamp(),
    });
    tx.update(ref, {
      lastMessageBy: uid,
      lastMessageText: text.trim().slice(0, 160),
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}
export const closeJob = (id) =>
  updateDoc(doc(db, "jobs", id), { status: "closed" });
export async function publishJob(data, user, profile, draftId, requestId) {
  return contract({
    operation: "publish",
    id: requestId,
    job: data,
    ...(draftId ? { draftId } : {}),
  });
}
export const watchDrafts = (uid, cb, err) =>
  onSnapshot(
    collection(db, "profiles", uid, "jobDrafts"),
    (s) =>
      cb(
        rows(s).sort(
          (a, b) => timestampMillis(b.updatedAt) - timestampMillis(a.updatedAt),
        ),
      ),
    err,
  );
export async function saveDraft(uid, form, id) {
  const ref = id
    ? doc(db, "profiles", uid, "jobDrafts", id)
    : doc(collection(db, "profiles", uid, "jobDrafts"));
  await setDoc(ref, { form, updatedAt: serverTimestamp() });
  return ref.id;
}
export const getDraft = async (uid, id) => {
  const s = await getDoc(doc(db, "profiles", uid, "jobDrafts", id));
  return s.exists() ? s.data().form : null;
};
export const deleteDraft = (uid, id) =>
  deleteDoc(doc(db, "profiles", uid, "jobDrafts", id));
export const watchSaved = (uid, cb, err) =>
  onSnapshot(
    collection(db, "profiles", uid, "savedJobs"),
    (s) => cb(rows(s).map((d) => d.id)),
    err,
  );
export const saveJob = (uid, id, saved) =>
  saved
    ? deleteDoc(doc(db, "profiles", uid, "savedJobs", id))
    : setDoc(doc(db, "profiles", uid, "savedJobs", id), {
        savedAt: serverTimestamp(),
      });
export const watchRead = (uid, cb, err) =>
  onSnapshot(
    collection(db, "profiles", uid, "readEvents"),
    (s) =>
      cb(Object.fromEntries(rows(s).map((d) => [d.id, timestampMillis(d.at)]))),
    err,
  );
export const markRead = (uid, id) =>
  setDoc(doc(db, "profiles", uid, "readEvents", id), { at: serverTimestamp() });
export const watchJob = (id, cb, error) =>
  onSnapshot(
    doc(db, "jobs", id),
    (s) => cb(s.exists() ? { ...s.data(), id: s.id } : null),
    error,
  );
export const getJob = async (id) => {
  const s = await getDoc(doc(db, "jobs", id));
  return s.exists() ? { ...s.data(), id: s.id } : null;
};
export const getPublicProfile = async (id) => {
  const s = await getDoc(doc(db, "publicProfiles", id));
  return s.exists() ? { ...s.data(), id: s.id } : null;
};
export const getReviews = async (id) =>
  rows(
    await getDocs(
      query(collection(db, "reviews"), where("subjectId", "==", id)),
    ),
  );
export const getReputation = async (workerId) => {
  const s = await getDoc(doc(db, "reputations", workerId));
  return s.exists() ? s.data() : {};
};
export const getWorkHistory = async (workerId) =>
  rows(
    await getDocs(
      query(collection(db, "workHistory"), where("workerId", "==", workerId)),
    ),
  ).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
export const getHistoryClaims = async (workerId) =>
  rows(await getDocs(collection(db, "profiles", workerId, "historyClaims"))).sort(
    (a, b) => (b.date || "").localeCompare(a.date || ""),
  );
export const createHistoryClaim = (uid, data) =>
  setDoc(doc(collection(db, "profiles", uid, "historyClaims")), {
    ...data,
    status: data.companyId ? "pending" : "self_declared",
    createdAt: serverTimestamp(),
  });
export const deleteHistoryClaim = (uid, claimId) =>
  deleteDoc(doc(db, "profiles", uid, "historyClaims", claimId));
export const watchApprovalRequests = (companyId, cb, err) =>
  onSnapshot(
    query(
      collectionGroup(db, "historyClaims"),
      where("companyId", "==", companyId),
      where("status", "==", "pending"),
    ),
    (s) =>
      cb(
        s.docs.map((d) => ({
          ...d.data(),
          id: d.id,
          workerId: d.ref.parent.parent.id,
        })),
      ),
    err,
  );
export const endorse = (workerId, claimId, decision) =>
  contract({ operation: "endorse", workerId, claimId, decision });
export const review = (a, uid, rating, text) =>
  setDoc(doc(db, "reviews", `${a.id}_${uid}`), {
    engagementId: a.id,
    authorId: uid,
    subjectId: uid === a.companyId ? a.workerId : a.companyId,
    rating: Number(rating),
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
export const adminApi = (operation, data = {}) =>
  contract({ ...data, operation }, administration);
export const getCompanyStatus = async (uid) => {
  const s = (await getDoc(doc(db, "companyStatus", uid))).data();
  return { verification: s?.verification || "pending", app: s?.app || null };
};
// Pedidos de passagem para a app própria da empresa (a empresa vê os seus; a pessoa, os dela).
export const watchHandovers = (uid, company, cb, err) =>
  onSnapshot(
    query(
      collection(db, "handovers"),
      where(company ? "companyId" : "workerId", "==", uid),
    ),
    (s) => cb(rows(s)),
    err,
  );
export const confirmHandover = (workerId, done) =>
  contract({ operation: "handover", workerId, done });
// O id liga quem denuncia ao alvo: repetir não cria uma segunda denúncia.
export const createReport = (uid, { targetType, targetId, engagementId, reason, text }) =>
  setDoc(doc(db, "reports", `${uid}_${targetType}_${targetId}`), {
    reporterId: uid,
    targetType,
    targetId,
    ...(engagementId ? { engagementId } : {}),
    reason,
    text: text.trim(),
    status: "open",
    createdAt: serverTimestamp(),
  });
export const exportMyData = () => contract({ operation: "exportData" }, accountRights);
export const deleteMyAccount = (reason) =>
  contract({ operation: "deleteAccount", reason }, accountRights);
