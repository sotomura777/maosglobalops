/**
 * Dá ou retira o acesso de administração a uma conta (custom claim `admin`).
 * A app nunca consegue pôr esta claim: só este script, com credenciais do projeto.
 *
 *   node scripts/set-admin.mjs --project maosglobalops --email eu@exemplo.pt            # ensaio
 *   node scripts/set-admin.mjs --project maosglobalops --email eu@exemplo.pt --execute
 *   node scripts/set-admin.mjs --project maosglobalops --email eu@exemplo.pt --revoke --execute
 *
 * No emulador: FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 e --project demo-globalops.
 * A pessoa tem de sair e voltar a entrar para o novo acesso aparecer na app.
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
const args = process.argv.slice(2),
  projectId = args[args.indexOf("--project") + 1],
  email = args[args.indexOf("--email") + 1];
if (!["maosglobalops", "demo-globalops"].includes(projectId))
  throw new Error("Indica --project maosglobalops ou demo-globalops.");
if (!args.includes("--email") || !email || email.startsWith("--"))
  throw new Error("Indica --email da conta.");
const execute = args.includes("--execute"),
  revoke = args.includes("--revoke");
const auth = getAuth(initializeApp({ projectId }));
const user = await auth.getUserByEmail(email);
const claims = { ...(user.customClaims || {}) };
if (revoke) delete claims.admin;
else claims.admin = true;
console.log(
  JSON.stringify(
    {
      projectId,
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      adminBefore: user.customClaims?.admin === true,
      adminAfter: !revoke,
      execute,
    },
    null,
    2,
  ),
);
if (!user.emailVerified && !revoke)
  throw new Error("Confirma primeiro o email desta conta.");
if (execute) {
  await auth.setCustomUserClaims(user.uid, claims);
  // Obriga a nova sessão a trazer a claim atualizada.
  await auth.revokeRefreshTokens(user.uid);
  console.log("Feito.");
} else console.log("Ensaio: nada foi alterado. Acrescenta --execute.");
