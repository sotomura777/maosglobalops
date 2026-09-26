import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
  initializeFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
});

const useEmulators =
  import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true";
// App Check prova ao servidor que o pedido vem desta app. Sem chave (ou nos emuladores) fica desligado.
if (import.meta.env.VITE_APPCHECK_SITE_KEY && !useEmulators)
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(
      import.meta.env.VITE_APPCHECK_SITE_KEY,
    ),
    isTokenAutoRefreshEnabled: true,
  });

export const auth = getAuth(app);
export const functions = getFunctions(app, "europe-west1");
export const db = initializeFirestore(
  app,
  useEmulators ? { experimentalForceLongPolling: true } : {},
);

// Testes locais isolados da produção através dos emuladores Firebase.
if (useEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
