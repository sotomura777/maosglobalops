// Idempotent, dry-run by default. Reads/writes only GlobalOps.
import { isDeepStrictEqual } from "node:util";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { publicProfile } from "../src/services/publicProfile.js";
const args = process.argv.slice(2);
const projectId = args[args.indexOf("--project") + 1];
if (!["demo-globalops", "maosglobalops"].includes(projectId))
  throw new Error("Indica --project demo-globalops ou maosglobalops");
const db = getFirestore(initializeApp({ projectId }));
const execute = args.includes("--execute");
const profiles = await db.collection("profiles").get();
let changed = 0;
for (const profile of profiles.docs) {
  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(profile.ref);
    if (!fresh.exists) return;
    const target = db.collection("publicProfiles").doc(profile.id);
    const existing = await tx.get(target);
    const next = publicProfile(fresh.data());
    if (isDeepStrictEqual(existing.data(), next)) return;
    if (execute) tx.set(target, next);
    changed++;
  });
}
console.log(
  JSON.stringify({ projectId, execute, profiles: profiles.size, changed }),
);
