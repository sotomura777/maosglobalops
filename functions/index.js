import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentWritten, onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { createMarketplace } from "./marketplace.js";
import { createAdmin } from "./admin.js";
import { createAccount } from "./account.js";
import { refreshMarketStats } from "./stats.js";
import {
  deliver,
  engagementNotice,
  invitationNotice,
  resendSender,
  sendReminders,
} from "./mail.js";
initializeApp();
const options = {
  region: "europe-west1",
  // Ligar só depois de ver nas métricas que os clientes legítimos já enviam token (functions/.env.maosglobalops).
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === "true",
  maxInstances: 3,
  minInstances: 0,
  timeoutSeconds: 60,
  memory: "256MiB",
};
// Erros inesperados não expõem detalhes internos ao cliente.
const guarded = (handler) => async (request) => {
  try {
    return await handler(request);
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    console.error("callable failed", { code: e.code, message: e.message });
    throw new HttpsError(
      "internal",
      "Não foi possível guardar. Atualiza a página e tenta novamente.",
    );
  }
};
export const contracting = onCall(
  options,
  guarded(createMarketplace(getFirestore())),
);
// Direitos RGPD: exportar e apagar. Apagar pode tocar em muitos documentos, daí o tempo maior.
export const account = onCall(
  { ...options, timeoutSeconds: 300, memory: "512MiB" },
  guarded(createAccount(getFirestore(), getAuth())),
);
export const admin = onCall(
  { ...options, maxInstances: 1 },
  guarded(createAdmin(getFirestore(), getAuth())),
);

// Emails (Resend). A chave vive no Secret Manager: firebase functions:secrets:set RESEND_API_KEY
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
// Remetente e endereço da app: functions/.env.maosglobalops (MAIL_FROM=..., APP_URL=...).
const MAIL_FROM = process.env.MAIL_FROM || "GlobalOps <avisos@example.com>";
const APP_URL = process.env.APP_URL || "https://maosglobalops.web.app";
// Só se envia para emails confirmados no login.
const emailVerified = async (uid) => (await getAuth().getUser(uid)).emailVerified === true;
// Nos emuladores nunca sai nenhum email: fica só o registo em modo ensaio.
const sender = () =>
  resendSender(
    process.env.FUNCTIONS_EMULATOR === "true" ? "" : RESEND_API_KEY.value(),
    MAIL_FROM,
  );
export const engagementMail = onDocumentWritten(
  {
    document: "engagements/{id}",
    region: "europe-west1",
    maxInstances: 3,
    secrets: [RESEND_API_KEY],
  },
  async (event) => {
    const notice = engagementNotice(
      event.data?.before?.data(),
      event.data?.after?.data(),
      event.params.id,
      APP_URL,
    );
    // O id do evento é estável entre repetições, por isso o mesmo aviso não sai duas vezes.
    if (notice) await deliver(getFirestore(), `evt-${event.id}`, notice, sender(), emailVerified);
  },
);
// Médias de mercado para "Horas e ganhos", recalculadas de madrugada.
export const marketStats = onSchedule(
  { schedule: "0 4 * * *", timeZone: "Europe/Lisbon", region: "europe-west1" },
  async () => {
    await refreshMarketStats(getFirestore(), Date.now());
  },
);
export const invitationMail = onDocumentCreated(
  {
    document: "invitations/{id}",
    region: "europe-west1",
    maxInstances: 3,
    secrets: [RESEND_API_KEY],
  },
  async (event) => {
    const inv = event.data?.data();
    if (inv)
      await deliver(getFirestore(), `inv-${event.id}`, invitationNotice(inv, APP_URL), sender(), emailVerified);
  },
);
export const shiftReminders = onSchedule(
  {
    schedule: "0 18 * * *",
    timeZone: "Europe/Lisbon",
    region: "europe-west1",
    secrets: [RESEND_API_KEY],
  },
  async () => {
    await sendReminders(getFirestore(), sender(), Date.now(), APP_URL, emailVerified);
  },
);
