import { test } from "node:test";
import assert from "node:assert/strict";
import { engagementNotice, reminderNotice, resendSender, invitationNotice } from "../functions/mail.js";
const url = "https://app.example";
const base = {
  workerId: "w",
  companyId: "c",
  workerName: "Ana",
  companyName: "Aurora",
  title: "Mesa na gala",
  note: "",
};
const at = (status, extra = {}) => ({ ...base, status, ...extra });

test("each contracting step notifies the party that has to act", () => {
  const cases = [
    [null, at("pending", { actorId: "w" }), "c", /Nova candidatura/],
    [at("pending"), at("accepted", { actorId: "c" }), "w", /selecionado/],
    [at("accepted"), at("confirmed", { actorId: "w" }), "c", /confirmado/],
    [at("confirmed"), at("completion_requested", { actorId: "c" }), "w", /Confirma a conclusão/],
    [at("completion_requested"), at("confirmed", { actorId: "w", note: "Faltam horas" }), "c", /devolvido/],
    [at("completion_requested"), at("completed", { actorId: "w" }), "c", /concluído/],
    [at("pending"), at("rejected", { actorId: "c" }), "w", /não selecionada/],
    [at("confirmed"), at("no_show", { actorId: "c" }), "w", /Falta/],
    [at("confirmed"), at("cancelled", { actorId: "w", note: "Doente" }), "c", /Cancelado/],
    [at("accepted"), at("cancelled", { actorId: "c" }), "w", /Cancelado/],
  ];
  for (const [before, after, uid, subject] of cases) {
    const n = engagementNotice(before, after, "e1", url);
    assert.equal(n.uid, uid, after.status);
    assert.match(n.subject, subject);
    assert.match(n.text, /https:\/\/app\.example\/app\/contratacoes\/e1/);
  }
  assert.match(
    engagementNotice(at("confirmed"), at("cancelled", { actorId: "w", note: "Doente" }), "e1", url).text,
    /Motivo indicado: Doente/,
  );
});

test("no email for silent changes, withdrawals or deletions", () => {
  assert.equal(engagementNotice(at("confirmed"), at("confirmed", { lastMessageText: "olá" }), "e", url), null);
  assert.equal(engagementNotice(at("pending"), at("cancelled", { actorId: "w" }), "e", url), null);
  assert.equal(engagementNotice(at("confirmed"), null, "e", url), null);
});

test("reminders carry the agreed time and place; no key means nothing leaves", async () => {
  const n = reminderNotice(
    at("confirmed", { agreedTerms: { date: "2026-10-01", startTime: "18:00", endTime: "23:00", location: "Pavilhão" } }),
    "e9",
    url,
  );
  assert.equal(n.uid, "w");
  assert.match(n.subject, /2026-10-01, 18:00–23:00/);
  assert.match(n.text, /Local: Pavilhão/);
  assert.equal(await resendSender("", "x")("a@b.c", "s", "t", "k"), "dry_run");
});

test("an invitation tells the person it is an application, and that the company chooses", () => {
  const n = invitationNotice(
    { workerId: "w", companyName: "Aurora", title: "Gala", jobId: "j1", date: "2026-10-01", private: true },
    url,
  );
  assert.equal(n.uid, "w");
  assert.match(n.subject, /A Aurora convidou-te: Gala/);
  assert.match(n.text, /só para convidados/);
  assert.match(n.text, /a empresa escolhe/);
  assert.match(n.text, /https:\/\/app\.example\/app\/trabalhos\/j1/);
});
