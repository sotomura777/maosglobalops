import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  collectionGroup,
  query,
  where,
  updateDoc,
  writeBatch,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
let env, company, worker, stranger;
const job = {
  title: "Mesa",
  category: "Mesa",
  district: "Lisboa",
  location: "Hotel",
  date: "2099-10-10",
  startTime: "18:00",
  endTime: "02:00",
  rate: 12,
  vacancies: 2,
  payType: "hour",
  paymentTerms: "15 dias",
  description: "Serviço de mesa",
  transport: "",
  meal: "Incluída",
  equipment: "",
  status: "open",
  featured: false,
  companyId: "company",
  companyName: "Empresa",
  createdAt: "2026-09-14",
};
const fresh = () => ({
  jobId: "job",
  workerId: "worker",
  workerName: "Ana",
  companyId: "company",
  companyName: "Empresa",
  title: "Mesa",
  message: "Disponível",
  status: "pending",
  actorId: "worker",
  note: "",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-globalops",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: await readFile("firestore.rules", "utf8"),
    },
  });
  await env.clearFirestore();
  company = env
    .authenticatedContext("company", {
      email: "company@example.com",
      email_verified: true,
    })
    .firestore();
  worker = env
    .authenticatedContext("worker", {
      email: "worker@example.com",
      email_verified: true,
    })
    .firestore();
  stranger = env.authenticatedContext("stranger").firestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    for (const [id, kind, name] of [
      ["company", "company", "Empresa"],
      ["worker", "worker", "Ana"],
      ["stranger", "worker", "Outro"],
    ])
      await setDoc(doc(ctx.firestore(), "profiles", id), {
        kind,
        name,
        email: id + "@example.com",
        gdprConsent: true,
        createdAt: "2026-09-14",
      });
  });
});
after(async () => env?.cleanup());
const seed = (collectionName, key, data) =>
  env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), collectionName, key), data),
  );
test("clients cannot publish offers directly, even with company credentials", async () => {
  await assertFails(setDoc(doc(company, "jobs", "job"), job));
  await seed("jobs", "job", job);
  await assertFails(
    setDoc(doc(worker, "jobs", "fake"), { ...job, companyId: "worker" }),
  );
  await assertFails(setDoc(doc(company, "jobs", "bad"), { ...job, rate: -10 }));
  await assertFails(
    setDoc(doc(company, "jobs", "featured"), { ...job, featured: true }),
  );
});
test("applications are server-created and queryable only by parties", async () => {
  await assertSucceeds(getDoc(doc(worker, "engagements", "job_worker")));
  await assertFails(setDoc(doc(worker, "engagements", "job_worker"), fresh()));
  await seed("engagements", "job_worker", fresh());
  await assertFails(setDoc(doc(worker, "engagements", "job_worker"), fresh()));
  await assertFails(
    setDoc(doc(worker, "engagements", "spoof_worker"), {
      ...fresh(),
      companyId: "stranger",
    }),
  );
  await assertSucceeds(
    getDocs(
      query(
        collection(company, "engagements"),
        where("companyId", "==", "company"),
      ),
    ),
  );
  await assertSucceeds(
    getDocs(
      query(
        collection(worker, "engagements"),
        where("workerId", "==", "worker"),
      ),
    ),
  );
  await assertFails(getDoc(doc(stranger, "engagements", "job_worker")));
});
test("clients cannot bypass the server to change contracting state or occupancy", async () => {
  for (const db of [company, worker])
    for (const status of ["accepted", "confirmed", "completed", "cancelled"]) {
      await assertFails(
        updateDoc(doc(db, "engagements", "job_worker"), {
          status,
          actorId: db === company ? "company" : "worker",
          note: "",
          updatedAt: serverTimestamp(),
        }),
      );
    }
  await assertFails(updateDoc(doc(company, "jobs", "job"), { filled: 1 }));
  await assertFails(
    setDoc(doc(worker, "workerSchedules", "worker"), {
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(getDoc(doc(company, "workerSchedules", "worker")));
  await assertFails(
    setDoc(doc(worker, "engagements", "job_worker", "events", "fake"), {
      to: "completed",
    }),
  );
  await seed("engagements", "job_worker", { ...fresh(), status: "completed" });
});
test("messages are private, bounded and cannot impersonate another participant", async () => {
  const message = {
    senderId: "worker",
    text: "Obrigado!",
    createdAt: serverTimestamp(),
  };
  await assertSucceeds(
    setDoc(
      doc(worker, "engagements", "job_worker", "messages", "hello"),
      message,
    ),
  );
  await assertSucceeds(
    getDocs(collection(company, "engagements", "job_worker", "messages")),
  );
  await assertFails(
    getDocs(collection(stranger, "engagements", "job_worker", "messages")),
  );
  await assertFails(
    setDoc(doc(stranger, "engagements", "job_worker", "messages", "bad"), {
      ...message,
      senderId: "stranger",
    }),
  );
  await assertFails(
    setDoc(doc(worker, "engagements", "job_worker", "messages", "spoof"), {
      ...message,
      senderId: "company",
    }),
  );
  await assertFails(
    setDoc(doc(worker, "engagements", "job_worker", "messages", "long"), {
      ...message,
      text: "a".repeat(2001),
    }),
  );
});
test("reviews are once per participant, on completed jobs only", async () => {
  const review = {
    engagementId: "job_worker",
    authorId: "worker",
    subjectId: "company",
    rating: 5,
    text: "Bom trabalho",
    createdAt: serverTimestamp(),
  };
  await assertSucceeds(
    setDoc(doc(worker, "reviews", "job_worker_worker"), review),
  );
  await assertFails(
    setDoc(doc(worker, "reviews", "job_worker_worker"), {
      ...review,
      rating: 1,
    }),
  );
  await assertFails(
    setDoc(doc(stranger, "reviews", "job_worker_stranger"), {
      ...review,
      authorId: "stranger",
    }),
  );
  await assertFails(
    setDoc(doc(company, "reviews", "job_worker_company"), {
      ...review,
      authorId: "company",
      subjectId: "worker",
      rating: 6,
    }),
  );
  await assertSucceeds(
    setDoc(doc(company, "reviews", "job_worker_company"), {
      ...review,
      authorId: "company",
      subjectId: "worker",
    }),
  );
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), "engagements", "incomplete"), {
      ...fresh(),
      status: "confirmed",
    }),
  );
  await assertFails(
    setDoc(doc(worker, "reviews", "incomplete_worker"), {
      ...review,
      engagementId: "incomplete",
    }),
  );
});
test("profile trust fields and imported validation badges cannot be self-assigned", async () => {
  await assertSucceeds(
    updateDoc(doc(worker, "profiles", "worker"), {
      name: "Ana Silva",
      bio: "Mesa e bar",
    }),
  );
  for (const changes of [
    { kind: "company" },
    { verified: true },
    { viaApp: true },
    { score: 1000 },
    { email: "someone@example.com" },
  ])
    await assertFails(updateDoc(doc(worker, "profiles", "worker"), changes));
  await assertFails(
    setDoc(doc(company, "validations", "fake"), {
      workerId: "worker",
      companyId: "company",
      role: "Mesa",
      viaApp: true,
      hours: 1000,
    }),
  );
  await assertFails(
    setDoc(doc(worker, "channels", "c-worker"), {
      type: "company",
      companyId: "worker",
      name: "Ana Silva",
      createdAt: "now",
    }),
  );
  await assertFails(
    setDoc(doc(worker, "reputations", "worker"), {
      workerId: "worker",
      completed: 100,
    }),
  );
  await assertFails(
    setDoc(doc(company, "reputations", "worker"), {
      workerId: "worker",
      noShows: 0,
    }),
  );
  await seed("reputations", "worker", { workerId: "worker", completed: 3 });
  await assertSucceeds(getDoc(doc(worker, "reputations", "worker")));
  await assertFails(
    setDoc(doc(worker, "workHistory", "forged"), {
      workerId: "worker",
      title: "Mesa",
      verified: true,
    }),
  );
  await seed("workHistory", "wh1", {
    workerId: "worker",
    title: "Mesa",
    verified: true,
  });
  await assertSucceeds(getDoc(doc(worker, "workHistory", "wh1")));
});
test("workers declare past jobs but can never self-verify or edit a verified one", async () => {
  const base = {
    title: "Bar",
    companyName: "Festival X",
    status: "self_declared",
    createdAt: "2026-09-14",
  };
  const claim = (id) =>
    doc(worker, "profiles", "worker", "historyClaims", id);
  await assertSucceeds(setDoc(claim("h1"), base));
  await assertSucceeds(
    setDoc(claim("h2"), { ...base, companyId: "company", status: "pending" }),
  );
  await assertSucceeds(getDoc(claim("h1")));
  // The worker cannot grant themselves the verified badge.
  await assertFails(setDoc(claim("h3"), { ...base, status: "verified" }));
  // Another account cannot write into the worker's claims.
  await assertFails(
    setDoc(doc(company, "profiles", "worker", "historyClaims", "h4"), base),
  );
  // A server-verified entry is frozen against client edits or deletion.
  await seed("profiles/worker/historyClaims", "hv", {
    ...base,
    status: "verified",
  });
  await assertFails(updateDoc(claim("hv"), { title: "Alterado" }));
  await assertFails(deleteDoc(claim("hv")));
});
test("declared jobs are frozen once sent and hours/dates stay within bounds", async () => {
  const base = {
    title: "Bar",
    companyName: "Festival X",
    status: "self_declared",
    createdAt: "2026-09-14",
  };
  const claim = (id) => doc(worker, "profiles", "worker", "historyClaims", id);
  // A request the company may be looking at cannot be rewritten behind its back.
  await assertSucceeds(
    setDoc(claim("sent"), { ...base, companyId: "company", status: "pending", hours: 6 }),
  );
  await assertFails(updateDoc(claim("sent"), { title: "Chefe de sala", hours: 900 }));
  await assertSucceeds(deleteDoc(claim("sent")));
  // Out-of-range hours and malformed dates are refused.
  await assertFails(setDoc(claim("neg"), { ...base, hours: -1 }));
  await assertFails(setDoc(claim("huge"), { ...base, hours: 1e308 }));
  await assertFails(setDoc(claim("date"), { ...base, date: "ontem" }));
  await assertSucceeds(setDoc(claim("month"), { ...base, date: "2024-06", hours: 40 }));
  await assertSucceeds(setDoc(claim("day"), { ...base, date: "2024-06-03" }));
  // Only the server records a rejection; the worker can remove it but not revive it.
  await assertFails(setDoc(claim("rej"), { ...base, status: "rejected" }));
  await seed("profiles/worker/historyClaims", "rejected", {
    ...base,
    companyId: "company",
    status: "rejected",
  });
  await assertFails(updateDoc(claim("rejected"), { status: "pending" }));
  await assertSucceeds(deleteDoc(claim("rejected")));
});
test("topic channels keep fixed names and posts carry the server time", async () => {
  await assertFails(
    setDoc(doc(worker, "channels", "t-porto"), {
      type: "topic",
      name: "# vandalizado",
      createdAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    setDoc(doc(worker, "channels", "t-porto"), {
      type: "topic",
      name: "# porto",
      createdAt: serverTimestamp(),
    }),
  );
  // Once created, nobody renames it.
  await assertFails(updateDoc(doc(worker, "channels", "t-porto"), { name: "# porto" }));
  // Earlier tests may rename the profiles; the post must carry the current name.
  const names = {};
  await env.withSecurityRulesDisabled(async (ctx) => {
    for (const uid of ["worker", "stranger"])
      names[uid] = (await getDoc(doc(ctx.firestore(), "profiles", uid))).data().name;
  });
  const post = (db, createdAt) => {
    const uid = db === worker ? "worker" : "stranger";
    return setDoc(doc(db, "channels", "t-porto", "posts", "p" + Math.random()), {
      authorId: uid,
      authorName: names[uid],
      authorKind: "worker",
      text: "Olá",
      createdAt,
    });
  };
  // A forged far-future date would pin the post to the top.
  await assertFails(post(worker, "9999-12-31T00:00:00Z"));
  await assertSucceeds(post(worker, serverTimestamp()));
  // Unverified accounts cannot post.
  await assertFails(post(stranger, serverTimestamp()));
});
test("a company only reads the pending approval requests addressed to it", async () => {
  await seed("profiles/worker/historyClaims", "req", {
    title: "Bar",
    companyName: "Empresa",
    companyId: "company",
    status: "pending",
    createdAt: "2026-09-14",
  });
  await assertSucceeds(
    getDocs(
      query(
        collectionGroup(company, "historyClaims"),
        where("companyId", "==", "company"),
        where("status", "==", "pending"),
      ),
    ),
  );
  // Without the mandatory filters the group query is denied.
  await assertFails(getDocs(collectionGroup(company, "historyClaims")));
  await assertFails(
    getDocs(
      query(
        collectionGroup(stranger, "historyClaims"),
        where("companyId", "==", "company"),
        where("status", "==", "pending"),
      ),
    ),
  );
});
test("personal logs, saved jobs and notifications remain private", async () => {
  await assertSucceeds(
    setDoc(doc(worker, "profiles", "worker", "savedJobs", "job"), {
      savedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    setDoc(doc(worker, "profiles", "worker", "readEvents", "job_worker"), {
      at: serverTimestamp(),
    }),
  );
  await assertFails(
    getDocs(collection(company, "profiles", "worker", "savedJobs")),
  );
  await assertFails(
    setDoc(doc(company, "profiles", "worker", "readEvents", "job_worker"), {
      at: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    setDoc(doc(worker, "profiles", "worker", "worklog", "entry"), {
      date: "2026-09-14",
      hours: 8,
      rate: 12,
      company: "Empresa",
      createdAt: "now",
    }),
  );
  await assertFails(
    getDoc(doc(company, "profiles", "worker", "worklog", "entry")),
  );
});
test("closing the offer prevents new applications without deleting the history", async () => {
  await assertSucceeds(
    updateDoc(doc(company, "jobs", "job"), { status: "closed" }),
  );
  await assertFails(updateDoc(doc(company, "jobs", "job"), { status: "open" }));
  await assertFails(
    setDoc(doc(stranger, "engagements", "job_stranger"), {
      ...fresh(),
      workerId: "stranger",
      workerName: "Outro",
      actorId: "stranger",
    }),
  );
  assert.equal(
    (await getDoc(doc(worker, "engagements", "job_worker"))).data().status,
    "completed",
  );
});

test("legacy migration is dry-run by default and preserves existing engagement states", async () => {
  const { spawnSync } = await import("node:child_process");
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "jobs", "legacy-job"), job);
    await setDoc(
      doc(ctx.firestore(), "jobs", "legacy-job", "applications", "worker"),
      {
        name: "Ana",
        message: "Candidatura anterior",
        createdAt: "2026-09-01T10:00:00Z",
      },
    );
  });
  const run = (execute) => {
    const result = spawnSync(
      process.execPath,
      [
        "scripts/migrate-marketplace.mjs",
        "--project",
        "demo-globalops",
        ...(execute ? ["--execute"] : []),
      ],
      {
        encoding: "utf8",
        env: { ...process.env, FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" },
      },
    );
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  assert.equal(run(false).toCreate, 1);
  assert.equal(
    (await getDoc(doc(worker, "engagements", "legacy-job_worker"))).exists(),
    false,
  );
  assert.equal(run(true).created, 1);
  await assertFails(
    updateDoc(doc(company, "engagements", "legacy-job_worker"), {
      status: "accepted",
      actorId: "company",
      note: "",
      updatedAt: serverTimestamp(),
    }),
  );
  await env.withSecurityRulesDisabled((ctx) =>
    updateDoc(doc(ctx.firestore(), "engagements", "legacy-job_worker"), {
      status: "accepted",
    }),
  );
  assert.equal(run(true).created, 0);
  assert.equal(
    (await getDoc(doc(worker, "engagements", "legacy-job_worker"))).data()
      .status,
    "accepted",
  );
});

test("drafts remain private and direct publication batches cannot delete them", async () => {
  const ref = doc(company, "profiles", "company", "jobDrafts", "draft");
  const draft = {
    form: { title: "Oferta por completar" },
    updatedAt: serverTimestamp(),
  };
  await assertSucceeds(setDoc(ref, draft));
  await assertFails(
    getDoc(doc(worker, "profiles", "company", "jobDrafts", "draft")),
  );
  await assertFails(
    setDoc(doc(worker, "profiles", "worker", "jobDrafts", "draft"), draft),
  );
  const bad = writeBatch(company);
  bad.set(doc(company, "jobs", "from-draft"), { ...job, rate: -1 });
  bad.delete(ref);
  await assertFails(bad.commit());
  assert.equal((await getDoc(ref)).exists(), true);
  const good = writeBatch(company);
  good.set(doc(company, "jobs", "from-draft"), job);
  good.delete(ref);
  await assertFails(good.commit());
  assert.equal((await getDoc(ref)).exists(), true);
});
test("message previews are bounded and writable only by participants", async () => {
  const data = {
    lastMessageBy: "worker",
    lastMessageAt: serverTimestamp(),
    lastMessageText: "Olá",
    updatedAt: serverTimestamp(),
  };
  await assertSucceeds(
    updateDoc(doc(worker, "engagements", "job_worker"), data),
  );
  await assertFails(
    updateDoc(doc(stranger, "engagements", "job_worker"), {
      ...data,
      lastMessageBy: "stranger",
    }),
  );
  await assertFails(
    updateDoc(doc(worker, "engagements", "job_worker"), {
      ...data,
      lastMessageText: "a".repeat(161),
    }),
  );
});

test("private identity is never exposed; public projection and visibility change atomically", async () => {
  const privateRef = doc(worker, "profiles", "worker");
  const publicRef = doc(worker, "publicProfiles", "worker");
  const projection = {
    name: "Ana Silva",
    kind: "worker",
    public: true,
    bio: "Mesa",
  };
  await assertFails(updateDoc(privateRef, { public: true }));
  const publish = writeBatch(worker);
  publish.update(privateRef, { public: true, phone: "912345678" });
  publish.set(publicRef, projection);
  await assertSucceeds(publish.commit());
  await assertSucceeds(getDoc(doc(company, "publicProfiles", "worker")));
  await assertSucceeds(
    getDocs(
      query(collection(company, "publicProfiles"), where("public", "==", true)),
    ),
  );
  await assertFails(getDoc(doc(company, "profiles", "worker")));
  await assertFails(
    getDocs(
      query(collection(company, "profiles"), where("public", "==", true)),
    ),
  );
  for (const field of [
    "email",
    "phone",
    "gdprConsent",
    "verified",
    "score",
    "importExperience",
  ]) {
    await assertFails(updateDoc(publicRef, { [field]: "private-or-trusted" }));
  }
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), "validations", "official"), {
      workerId: "worker",
      hours: 8,
      viaApp: true,
    }),
  );
  await assertSucceeds(
    getDocs(
      query(
        collection(company, "validations"),
        where("workerId", "==", "worker"),
      ),
    ),
  );
  await assertFails(getDocs(collection(company, "validations")));
  await assertFails(updateDoc(privateRef, { public: false }));
  const hide = writeBatch(worker);
  hide.update(privateRef, { public: false });
  hide.set(publicRef, { ...projection, public: false });
  await assertSucceeds(hide.commit());
  await assertFails(getDoc(doc(company, "publicProfiles", "worker")));
  await assertFails(getDoc(doc(company, "validations", "official")));
  await assertSucceeds(getDoc(doc(worker, "validations", "official")));
  await assertFails(updateDoc(publicRef, { public: true }));
  await assertFails(
    setDoc(doc(company, "publicProfiles", "worker"), projection),
  );
});

test("unverified identities cannot publish or apply, including direct API calls", async () => {
  const unverifiedCompany = env
    .authenticatedContext("company", {
      email: "company@example.com",
      email_verified: false,
    })
    .firestore();
  const unverifiedWorker = env
    .authenticatedContext("worker", {
      email: "worker@example.com",
      email_verified: false,
    })
    .firestore();
  await assertFails(setDoc(doc(unverifiedCompany, "jobs", "unverified"), job));
  await seed("jobs", "verified", job);
  await assertFails(
    setDoc(doc(unverifiedWorker, "engagements", "verified_worker"), {
      ...fresh(),
      jobId: "verified",
      workerName: "Ana Silva",
    }),
  );
  await assertFails(
    setDoc(doc(worker, "engagements", "verified_worker"), {
      ...fresh(),
      jobId: "verified",
      workerName: "Ana Silva",
    }),
  );
});

test("public profile migration is dry-run, idempotent and drops private fields", async () => {
  const { spawnSync } = await import("node:child_process");
  const run = (execute) => {
    const r = spawnSync(
      process.execPath,
      [
        "scripts/migrate-public-profiles.mjs",
        "--project",
        "demo-globalops",
        ...(execute ? ["--execute"] : []),
      ],
      {
        encoding: "utf8",
        env: { ...process.env, FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" },
      },
    );
    assert.equal(r.status, 0, r.stderr);
    return JSON.parse(r.stdout);
  };
  assert.ok(run(false).changed > 0);
  assert.equal(
    (await getDoc(doc(company, "publicProfiles", "company"))).exists(),
    false,
  );
  assert.ok(run(true).changed > 0);
  assert.equal(run(true).changed, 0);
  const data = (await getDoc(doc(worker, "publicProfiles", "worker"))).data();
  assert.equal(data.public, false);
  for (const key of ["email", "phone", "gdprConsent", "importExperience"])
    assert.equal(key in data, false);
  assert.equal(
    (await getDoc(doc(worker, "profiles", "worker"))).data().phone,
    "912345678",
  );
});
