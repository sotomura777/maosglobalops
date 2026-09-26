import { FieldValue } from "firebase-admin/firestore";
// Passagem de staff para a app própria da empresa (ver docs/arquitetura-empresas.md).
// Enquanto a app da empresa não o faz sozinha, o pedido fica aqui para o admin da empresa
// criar ou apagar a conta à mão e confirmar.
const ACTIVE = ["accepted", "confirmed", "completion_requested"];

// Faz as leituras dentro da transação (antes de qualquer escrita) e devolve a escrita a aplicar.
export async function planHandover(tx, db, a, engagementId, next) {
  const cancelsAccepted =
    next === "cancelled" && ["accepted", "confirmed"].includes(a.status);
  if (next !== "accepted" && next !== "completed" && !cancelsAccepted) return null;
  const ref = db.doc(`handovers/${a.companyId}_${a.workerId}`);
  const [statusSnap, handoverSnap] = await Promise.all([
    tx.get(db.doc(`companyStatus/${a.companyId}`)),
    tx.get(ref),
  ]);
  const app = statusSnap.data()?.app,
    h = handoverSnap.data();
  const updatedAt = FieldValue.serverTimestamp();
  if (next === "accepted") {
    if (!app) return null;
    const p = (await tx.get(db.doc(`profiles/${a.workerId}`))).data() || {};
    // A conta ainda existe na app enquanto não for confirmada como apagada.
    const exists = ["created", "to_delete"].includes(h?.status);
    return () =>
      tx.set(
        ref,
        {
          companyId: a.companyId,
          workerId: a.workerId,
          companyName: a.companyName,
          appName: app.name,
          appUrl: app.url,
          workerName: p.name || a.workerName,
          email: p.email || "",
          phone: p.phone || "",
          engagementIds: FieldValue.arrayUnion(engagementId),
          status: exists ? "created" : "to_create",
          worked: h?.worked === true,
          updatedAt,
          ...(h ? {} : { createdAt: updatedAt }),
        },
        { merge: true },
      );
  }
  if (!h) return null;
  if (next === "completed") return () => tx.update(ref, { worked: true, updatedAt });
  // Recusa antes de trabalhar: só apaga se não houver outro trabalho ativo com a empresa.
  if (h.worked || !["to_create", "created"].includes(h.status)) return null;
  const others = await tx.get(
    db
      .collection("engagements")
      .where("workerId", "==", a.workerId)
      .where("companyId", "==", a.companyId),
  );
  if (others.docs.some((d) => d.id !== engagementId && ACTIVE.includes(d.data().status)))
    return null;
  return () =>
    tx.update(
      ref,
      h.status === "created"
        ? { status: "to_delete", updatedAt }
        : { status: "cancelled", email: "", phone: "", updatedAt },
    );
}

// A empresa confirma que criou ou apagou a conta na sua app.
export async function confirmHandover(db, companyUid, workerId, done, fail) {
  if (!["created", "deleted"].includes(done))
    fail("Operação inválida.", "invalid-argument");
  const ref = db.doc(`handovers/${companyUid}_${workerId}`);
  await db.runTransaction(async (tx) => {
    const h = (await tx.get(ref)).data();
    if (!h || h.companyId !== companyUid)
      fail("Pedido indisponível.", "permission-denied");
    if (h.status === done) return;
    if (h.status !== (done === "created" ? "to_create" : "to_delete"))
      fail("Este pedido já não está nesse estado. Atualiza a página.");
    tx.update(ref, {
      status: done,
      updatedAt: FieldValue.serverTimestamp(),
      // Depois de apagada a conta, a empresa deixa de ter aqui os contactos.
      ...(done === "deleted" ? { email: "", phone: "" } : {}),
    });
  });
  return { ok: true };
}
