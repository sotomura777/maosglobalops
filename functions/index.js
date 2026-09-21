import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { createMarketplace } from "./marketplace.js";
initializeApp();
const marketplace = createMarketplace(getFirestore());
export const contracting = onCall(
  {
    region: "europe-west1",
    maxInstances: 3,
    minInstances: 0,
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    try {
      return await marketplace(request);
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      console.error("contracting failed", { code: e.code, message: e.message });
      throw new HttpsError(
        "internal",
        "Não foi possível guardar. Atualiza a página e tenta novamente.",
      );
    }
  },
);
