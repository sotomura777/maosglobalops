import { scheduleOf, isLateCancellation } from "../../functions/schedule.js";
export const isLateCancel = (a, now = Date.now()) =>
  a?.status === "confirmed" &&
  a?.agreedTerms?.startMs > 0 &&
  isLateCancellation(a.agreedTerms.startMs, now);
export const STATUS = {
  pending: "Candidatura enviada",
  accepted: "Aguarda confirmação",
  confirmed: "Confirmado",
  completion_requested: "Confirmar conclusão",
  completed: "Concluído",
  rejected: "Não selecionado",
  cancelled: "Cancelado",
  no_show: "Faltou",
};
export const actionsFor = (status, company) =>
  ({
    pending: company
      ? [
          ["accepted", "Aceitar"],
          ["rejected", "Recusar"],
        ]
      : [["cancelled", "Retirar candidatura"]],
    accepted: company
      ? [["cancelled", "Cancelar"]]
      : [
          ["confirmed", "Confirmar trabalho"],
          ["cancelled", "Recusar trabalho"],
        ],
    confirmed: company
      ? [
          ["completion_requested", "Assinalar como realizado"],
          ["no_show", "Marcar falta"],
          ["cancelled", "Cancelar"],
        ]
      : [["cancelled", "Cancelar"]],
    completion_requested: company
      ? []
      : [
          ["completed", "Confirmar conclusão"],
          ["confirmed", "Pedir correção"],
        ],
  })[status] || [];
export const money = (n) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(
    Number(n) || 0,
  );
export const payLabel = (j) =>
  j.rate
    ? `${money(j.rate)}${j.payType === "service" ? " / serviço" : " / h"}`
    : j.pay || "Valor a acordar";
export const dateLabel = (d) =>
  d && /^\d{4}-\d{2}-\d{2}$/.test(d)
    ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-PT")
    : d || "Data a definir";
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function attendanceRate(rep = {}) {
  const completed = rep.completed || 0;
  const total = completed + (rep.noShows || 0);
  return total ? Math.round((completed / total) * 100) : null;
}
export function validateJob(j) {
  if (!j.title?.trim() || !j.category || !j.district || !j.location?.trim())
    return "Preenche título, função, distrito e local.";
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(j.date) ||
    j.date < today() ||
    !j.startTime ||
    !j.endTime
  )
    return "Indica uma data futura e o horário.";
  try {
    if (scheduleOf(j).startMs <= Date.now())
      return "O trabalho tem de começar no futuro.";
  } catch (e) {
    return e.message;
  }
  if (
    !(Number(j.rate) > 0) ||
    !Number.isFinite(Number(j.rate)) ||
    Number(j.rate) > 100000
  )
    return "Indica um valor de pagamento válido.";
  if (
    !Number.isInteger(Number(j.vacancies)) ||
    Number(j.vacancies) < 1 ||
    Number(j.vacancies) > 1000
  )
    return "Indica entre 1 e 1000 vagas.";
  if (!j.paymentTerms?.trim() || !j.description?.trim())
    return "Indica o prazo de pagamento e descreve o trabalho.";
  return "";
}

export const timestampMillis = (value) =>
  value?.toMillis?.() ||
  (value?.seconds || 0) * 1000 +
    Math.floor((value?.nanoseconds || 0) / 1000000);

export function estimatePay(job) {
  if (!(Number(job.rate) > 0)) return null;
  if (job.payType === "service")
    return { total: Number(job.rate), hours: null, estimated: false };
  if (
    !/^\d{2}:\d{2}$/.test(job.startTime || "") ||
    !/^\d{2}:\d{2}$/.test(job.endTime || "")
  )
    return null;
  const minutes = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  let duration = minutes(job.endTime) - minutes(job.startTime);
  if (duration < 0) duration += 1440;
  if (!duration) return null;
  return {
    total: (Number(job.rate) * duration) / 60,
    hours: duration / 60,
    estimated: true,
  };
}
export function matchesJob(job, filters) {
  return (
    (!/^\d{4}-\d{2}-\d{2}$/.test(job.date) || job.date >= today()) &&
    (!filters.q ||
      `${job.title} ${job.companyName} ${job.description || ""}`
        .toLowerCase()
        .includes(filters.q.trim().toLowerCase())) &&
    (!filters.category || job.category === filters.category) &&
    (!filters.district || job.district === filters.district) &&
    (!filters.date || job.date === filters.date) &&
    (!filters.payType || job.payType === filters.payType) &&
    (!filters.rate || Number(job.rate) >= Number(filters.rate))
  );
}
export const needsResponse = (a, company) =>
  company
    ? a.status === "pending"
    : ["accepted", "completion_requested"].includes(a.status);
export const statusFor = (a, company) =>
  a.status === "pending"
    ? company
      ? "Por analisar"
      : "À espera da empresa"
    : a.status === "accepted"
      ? company
        ? "À espera do profissional"
        : "Precisa da tua confirmação"
      : STATUS[a.status];
export const emptyJob = (district = "") => ({
  title: "",
  category: "",
  district,
  location: "",
  date: "",
  startTime: "",
  endTime: "",
  vacancies: 1,
  rate: "",
  payType: "hour",
  paymentTerms: "",
  description: "",
  transport: "",
  meal: "",
  equipment: "",
});
export const jobForm = (job) =>
  Object.fromEntries(
    Object.entries(emptyJob()).map(([k, v]) => [k, job?.[k] ?? v]),
  );

// Ganhos dos trabalhos concluídos na GlobalOps, a partir das condições aceites na confirmação.
export function platformEarnings(applications) {
  return applications
    .filter(
      (a) =>
        a.status === "completed" &&
        a.agreedTerms?.endMs > a.agreedTerms?.startMs,
    )
    .map((a) => {
      const t = a.agreedTerms;
      const hours = Math.round((t.endMs - t.startMs) / 36000) / 100;
      return {
        id: a.id,
        source: "app",
        date: t.date,
        hours,
        amount: t.payType === "service" ? Number(t.rate) : Number(t.rate) * hours,
        title: a.title,
        company: a.companyName,
        jobId: a.jobId,
        district: t.district,
      };
    });
}
export const personalEarnings = (worklog) =>
  worklog.map((e) => ({
    id: e.id,
    source: "personal",
    date: e.date,
    hours: e.hours,
    amount: e.hours * e.rate,
    company: e.company,
  }));
export function summarizeEarnings(entries, month) {
  const add = (acc, e) => ({ hours: acc.hours + e.hours, amount: acc.amount + e.amount });
  const zero = { hours: 0, amount: 0 };
  const total = entries.reduce(add, zero);
  const app = entries.filter((e) => e.source === "app").reduce(add, zero);
  const months = new Map();
  for (const e of entries) {
    const m = (e.date || "").slice(0, 7);
    if (m) months.set(m, add(months.get(m) || zero, e));
  }
  return {
    month: months.get(month) || zero,
    total,
    average: total.hours ? total.amount / total.hours : 0,
    averageApp: app.hours ? app.amount / app.hours : 0,
    byMonth: [...months]
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 6)
      .map(([m, v]) => ({ month: m, ...v })),
  };
}
