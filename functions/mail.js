import { FieldValue } from "firebase-admin/firestore";
// Emails transacionais. As funções de composição são puras (testadas sem emulador);
// a entrega regista cada envio em mailLog/{id} para nunca repetir o mesmo aviso.

const link = (appUrl, id) => `${appUrl}/app/contratacoes/${id}`;
const when = (a) =>
  a.agreedTerms?.date
    ? ` (${a.agreedTerms.date}, ${a.agreedTerms.startTime}–${a.agreedTerms.endTime})`
    : "";

// Devolve o aviso a enviar para uma mudança de estado, ou null.
export function engagementNotice(before, after, id, appUrl) {
  if (!after) return null;
  const from = before?.status || null,
    to = after.status;
  if (from === to) return null;
  const a = after,
    url = link(appUrl, id);
  const other = a.actorId === a.workerId ? "company" : "worker";
  const notices = {
    pending: from === null && {
      to: "company",
      subject: `Nova candidatura: ${a.title}`,
      lines: [`${a.workerName} candidatou-se a "${a.title}".`, "Vê o perfil e responde na app."],
    },
    accepted: {
      to: "worker",
      subject: `Foste selecionado(a): ${a.title}`,
      lines: [
        `${a.companyName} aceitou a tua candidatura a "${a.title}".`,
        "Confirma o trabalho na app para garantir a vaga — só fica reservada quando confirmares.",
      ],
    },
    confirmed:
      from === "accepted"
        ? {
            to: "company",
            subject: `Trabalho confirmado: ${a.title}`,
            lines: [`${a.workerName} confirmou "${a.title}"${when(a)}.`],
          }
        : from === "completion_requested" && {
            to: "company",
            subject: `Pedido de conclusão devolvido: ${a.title}`,
            lines: [
              `${a.workerName} devolveu o pedido de conclusão de "${a.title}".`,
              a.note ? `Motivo indicado: ${a.note}` : "",
            ],
          },
    completed: {
      to: "company",
      subject: `Trabalho concluído: ${a.title}`,
      lines: [`${a.workerName} confirmou a conclusão de "${a.title}".`, "Deixa a tua avaliação na app."],
    },
    completion_requested: {
      to: "worker",
      subject: `Confirma a conclusão: ${a.title}`,
      lines: [
        `${a.companyName} assinalou "${a.title}" como realizado.`,
        "Confirma na app ou devolve o pedido se algo não estiver certo.",
      ],
    },
    rejected: {
      to: "worker",
      subject: `Candidatura não selecionada: ${a.title}`,
      lines: [
        `Desta vez ${a.companyName} escolheu outra pessoa para "${a.title}".`,
        "Há mais ofertas à tua espera na app.",
      ],
    },
    cancelled: from !== "pending" && {
      to: other,
      subject: `Cancelado: ${a.title}`,
      lines: [
        `${other === "worker" ? a.companyName : a.workerName} cancelou "${a.title}".`,
        a.note ? `Motivo indicado: ${a.note}` : "",
      ],
    },
    no_show: {
      to: "worker",
      subject: `Falta registada: ${a.title}`,
      lines: [
        `${a.companyName} registou que não compareceste a "${a.title}".`,
        a.note ? `Nota: ${a.note}` : "",
      ],
    },
  };
  const n = notices[to];
  if (!n) return null;
  return {
    uid: n.to === "worker" ? a.workerId : a.companyId,
    subject: n.subject,
    text: message(n.lines, url),
  };
}

export function reminderNotice(a, id, appUrl) {
  return {
    uid: a.workerId,
    subject: `Lembrete: ${a.title}${when(a)}`,
    text: message(
      [
        `Tens "${a.title}" com ${a.companyName}${when(a)}.`,
        a.agreedTerms?.location ? `Local: ${a.agreedTerms.location}` : "",
        "Se não puderes ir, cancela já na app para a empresa encontrar alternativa.",
      ],
      link(appUrl, id),
    ),
  };
}

export function invitationNotice(inv, appUrl) {
  return {
    uid: inv.workerId,
    subject: `A ${inv.companyName} convidou-te: ${inv.title}`,
    text: message(
      [
        `A ${inv.companyName} convidou-te para "${inv.title}"${inv.date ? ` (${inv.date})` : ""}.`,
        inv.private ? "Esta oferta é só para convidados." : "",
        "Se te interessar, candidata-te na app: a empresa escolhe entre quem aceitar o convite.",
      ],
      `${appUrl}/app/trabalhos/${inv.jobId}`,
    ),
  };
}

function message(lines, url) {
  return [
    "Olá,",
    "",
    ...lines.filter(Boolean),
    "",
    `Abrir na GlobalOps: ${url}`,
    "",
    "—",
    "Recebes este email porque tens avisos ativos em Segurança da conta.",
  ].join("\n");
}

// Envia um aviso uma única vez. `send` recebe (email, subject, text, key) e devolve
// "sent" ou "dry_run"; o endereço de email nunca é guardado no registo.
export async function deliver(db, logId, notice, send) {
  const logRef = db.doc(`mailLog/${logId}`);
  try {
    await logRef.create({
      uid: notice.uid,
      subject: notice.subject,
      status: "pending",
      at: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    if (e.code === 6) return "duplicate"; // ALREADY_EXISTS: já tratado.
    throw e;
  }
  const p = (await db.doc(`profiles/${notice.uid}`).get()).data();
  let status;
  if (!p?.email || p.suspended === true) status = "skipped";
  else if (p.emailNotifications === false) status = "opted_out";
  else {
    try {
      status = await send(p.email, notice.subject, notice.text, logId);
    } catch (e) {
      status = "failed";
      console.error("mail failed", { logId, message: e.message });
    }
  }
  await logRef.update({ status });
  return status;
}

// Sem chave (emuladores/testes) não sai nada: só fica o registo com dry_run.
export function resendSender(apiKey, from) {
  if (!apiKey) return async () => "dry_run";
  return async (email, subject, text, key) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      body: JSON.stringify({ from, to: [email], subject, text }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}`);
    return "sent";
  };
}

export async function sendReminders(db, send, now, appUrl) {
  // Corre às 18:00: apanha os trabalhos confirmados que começam entre 6 e 30 horas depois.
  const snap = await db
    .collection("engagements")
    .where("status", "==", "confirmed")
    .where("agreedTerms.startMs", ">", now + 6 * 3600000)
    .where("agreedTerms.startMs", "<=", now + 30 * 3600000)
    .get();
  let sent = 0;
  for (const d of snap.docs) {
    const r = await deliver(db, `reminder-${d.id}`, reminderNotice(d.data(), d.id, appUrl), send);
    if (r !== "duplicate") sent++;
  }
  return sent;
}
