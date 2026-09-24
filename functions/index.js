import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { createMarketplace } from "./marketplace.js";
import { createAdmin } from "./admin.js";
initializeApp();
const options = {
  region: "europe-west1",
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
export const admin = onCall(
  { ...options, maxInstances: 1 },
  guarded(createAdmin(getFirestore(), getAuth())),
);
