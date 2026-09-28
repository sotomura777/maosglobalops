import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRanking, rankingScore } from "../functions/ranking.js";

test("points: 20 per verified job, 1 per verified hour, minus no-shows and late cancellations", () => {
  assert.equal(rankingScore({ jobs: 3, hours: 24, noShows: 0, lateCancels: 0 }), 84);
  // One no-show takes 15%, one late cancellation 5%.
  assert.equal(rankingScore({ jobs: 3, hours: 24, noShows: 1, lateCancels: 1 }), 67);
  // Never below zero.
  assert.equal(rankingScore({ jobs: 1, hours: 5, noShows: 9, lateCancels: 0 }), 0);
});

test("only public workers and only work with validated companies count", () => {
  const workers = [
    { uid: "ana", name: "Ana", kind: "worker", public: true, district: "Lisboa" },
    { uid: "rui", name: "Rui", kind: "worker", public: true },
    { uid: "eva", name: "Eva", kind: "worker", public: true },
    { uid: "hidden", name: "H", kind: "worker", public: false },
    { uid: "co", name: "Empresa", kind: "company", public: true },
  ];
  const history = [
    { workerId: "ana", companyId: "good", source: "app", hours: 5 },
    { workerId: "ana", companyId: "good", source: "external", hours: 8 },
    // A company nobody validated (could be the worker's own fake account): ignored.
    { workerId: "rui", companyId: "fake", source: "app", hours: 100 },
    { workerId: "eva", companyId: "good", source: "app", hours: 5 },
    { workerId: "hidden", companyId: "good", source: "app", hours: 50 },
  ];
  const reputations = { eva: { noShows: 1 } };
  const reviews = [
    { subjectId: "ana", rating: 5 },
    { subjectId: "ana", rating: 4 },
    { subjectId: "eva", rating: 5 },
  ];
  const { entries } = buildRanking({ workers, history, reputations, reviews, verifiedCompanies: new Set(["good"]) });
  assert.deepEqual(
    entries.map((e) => [e.uid, e.score, e.jobs, e.hours, e.rating]),
    [
      ["ana", 53, 2, 13, 4.5],
      ["eva", 21, 1, 5, 5],
    ],
  );
});

test("ties are broken by rating, then by completed jobs", () => {
  const workers = ["a", "b"].map((uid) => ({ uid, name: uid, kind: "worker", public: true }));
  const history = [
    { workerId: "a", companyId: "good", source: "app", hours: 5 },
    { workerId: "b", companyId: "good", source: "app", hours: 5 },
  ];
  const reviews = [{ subjectId: "b", rating: 5 }, { subjectId: "a", rating: 3 }];
  const { entries } = buildRanking({ workers, history, reputations: {}, reviews, verifiedCompanies: new Set(["good"]) });
  assert.deepEqual(entries.map((e) => e.uid), ["b", "a"]);
});
