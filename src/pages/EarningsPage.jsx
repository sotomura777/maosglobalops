import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../App";
import {
  addWorkEntry,
  deleteWorkEntry,
  listWorkEntries,
} from "../services/workService";
import { Heading, Field, ErrorBox } from "../marketplace/Layout";
import {
  money,
  today,
  dateLabel,
  platformEarnings,
  personalEarnings,
  summarizeEarnings,
} from "../marketplace/model";
import { useMarket } from "../marketplace/context";
import { useJobDetails } from "../marketplace/useJobs";
import { getMarketStats } from "../marketplace/service";

const MIN_SAMPLE = 5;
const monthLabel = (m) =>
  new Date(`${m}-01T12:00:00`).toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
export default function EarningsPage() {
  const { user, profile } = useAuth();
  const { applications } = useMarket();
  const [market, setMarket] = useState(null);
  const [entries, setEntries] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    date: today(),
    hours: "",
    rate: "",
    company: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = () =>
    listWorkEntries(user.uid)
      .then(setEntries)
      .catch(() => setError("Não foi possível carregar os registos."));
  useEffect(() => {
    load();
    getMarketStats().then(setMarket).catch(() => {});
  }, [user.uid]);
  // Só os trabalhos feitos como profissional contam como ganhos.
  const platform = useMemo(
    () => (profile.kind === "worker" ? platformEarnings(applications) : []),
    [applications, profile.kind],
  );
  const details = useJobDetails(platform);
  const personal = useMemo(() => personalEarnings(entries || []), [entries]);
  const stats = useMemo(
    () => summarizeEarnings([...platform, ...personal], today().slice(0, 7)),
    [platform, personal],
  );
  // A minha média por função comparada com o mercado no mesmo distrito (ou no país).
  const comparison = useMemo(() => {
    const byCategory = new Map();
    for (const e of platform) {
      const category = details[e.jobId]?.category;
      if (!category || !e.hours) continue;
      const c = byCategory.get(category) || { hours: 0, amount: 0, district: e.district };
      c.hours += e.hours;
      c.amount += e.amount;
      byCategory.set(category, c);
    }
    return [...byCategory].map(([category, c]) => {
      const rates = market?.rates || [];
      const local = rates.find((r) => r.category === category && r.district === c.district);
      const national = rates.find((r) => r.category === category && r.district === "");
      const ref = local?.n >= MIN_SAMPLE ? local : national?.n >= MIN_SAMPLE ? national : null;
      return { category, mine: c.amount / c.hours, ref };
    });
  }, [platform, details, market]);
  return (
    <>
      <Heading
        eyebrow="Só tu vês esta página"
        title="Horas e ganhos"
        action={
          <button className="btn gold" onClick={() => setEditing(true)}>
            Registar trabalho
          </button>
        }
      >
        Os trabalhos concluídos na GlobalOps entram sozinhos. Regista aqui os
        que fizeste fora. Não representa pagamentos processados pela
        plataforma.
      </Heading>
      <ErrorBox>{error}</ErrorBox>
      <div className="earnings-summary">
        <div>
          <small>Este mês</small>
          <strong>{money(stats.month.amount)}</strong>
          <span>{Math.round(stats.month.hours * 10) / 10} horas</span>
        </div>
        <div>
          <small>Total</small>
          <strong>{money(stats.total.amount)}</strong>
          <span>Média de {money(stats.average)}/h</span>
        </div>
        <div>
          <small>Na GlobalOps</small>
          <strong>{money(stats.averageApp)}/h</strong>
          <span>{platform.length} {platform.length === 1 ? "trabalho concluído" : "trabalhos concluídos"}</span>
        </div>
      </div>
      {comparison.length > 0 && (
        <section className="panel" style={{ marginBottom: 20 }}>
          <h2 className="section-title">Comparado com o mercado</h2>
          {comparison.map((c) => (
            <div className="review row between wrap" key={c.category}>
              <strong>{c.category}</strong>
              <p className="subtle">
                A tua média: {money(c.mine)}/h
                {c.ref
                  ? ` · mercado${c.ref.district ? ` em ${c.ref.district}` : ""}: ${money(c.ref.avg)}/h (${c.ref.n} ofertas)`
                  : " · ainda poucas ofertas para comparar"}
              </p>
            </div>
          ))}
        </section>
      )}
      {stats.byMonth.length > 1 && (
        <section className="panel" style={{ marginBottom: 20 }}>
          <h2 className="section-title">Por mês</h2>
          {stats.byMonth.map((m) => (
            <div className="review row between" key={m.month}>
              <span>{monthLabel(m.month)}</span>
              <span>
                {Math.round(m.hours * 10) / 10} h · <strong>{money(m.amount)}</strong>
              </span>
            </div>
          ))}
        </section>
      )}
      {platform.length > 0 && (
        <>
          <h2 className="section-title" style={{ marginTop: 24 }}>
            Trabalhos na GlobalOps
          </h2>
          {platform.map((e) => (
            <div className="earnings-entry" key={e.id}>
              <div>
                <strong>{e.title}</strong>
                <p className="subtle">
                  {e.company} · {dateLabel(e.date)} · {e.hours} h
                </p>
              </div>
              <strong>{money(e.amount)}</strong>
              <span className="tag green">GlobalOps</span>
            </div>
          ))}
        </>
      )}
      {editing && (
        <form
          className="panel form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            const hours = Number(String(form.hours).replace(",", "."));
            const rate = Number(String(form.rate).replace(",", "."));
            if (
              !(hours > 0 && hours <= 24) ||
              !(rate >= 0 && rate <= 100000) ||
              !form.date
            )
              return setError(
                "Indica a data, até 24 horas e um valor/hora válido.",
              );
            setBusy(true);
            setError("");
            try {
              await addWorkEntry(user.uid, {
                date: form.date,
                hours,
                rate,
                company: form.company.trim() || null,
              });
              setForm({ date: today(), hours: "", rate: "", company: "" });
              setEditing(false);
              await load();
            } catch {
              setError("Não foi possível guardar. Os campos foram mantidos.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {[
            ["date", "Data", "date"],
            ["hours", "Horas", "text"],
            ["rate", "Valor por hora (€)", "text"],
            ["company", "Empresa (opcional)", "text"],
          ].map(([key, label, type]) => (
            <Field label={label} key={key}>
              <input
                required={key !== "company"}
                type={type}
                inputMode={
                  ["rate", "hours"].includes(key) ? "decimal" : undefined
                }
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </Field>
          ))}
          <div className="wide actions">
            <button className="btn gold" disabled={busy}>
              Guardar registo
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => setEditing(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      <h2 className="section-title" style={{ marginTop: 24 }}>
        Registo pessoal
      </h2>
      {entries === null ? (
        <p role="status">A carregar registos…</p>
      ) : entries.length ? (
        entries.map((e) => (
          <div className="earnings-entry" key={e.id}>
            <div>
              <strong>{e.company || "Trabalho independente"}</strong>
              <p className="subtle">
                {dateLabel(e.date)} · {e.hours} h × {money(e.rate)}
              </p>
            </div>
            <strong>{money(e.hours * e.rate)}</strong>
            <button
              className="quiet"
              aria-label={`Eliminar registo de ${e.date}`}
              onClick={async () => {
                if (!window.confirm("Eliminar este registo pessoal?")) return;
                try {
                  await deleteWorkEntry(user.uid, e.id);
                  await load();
                } catch {
                  setError("Não foi possível eliminar o registo.");
                }
              }}
            >
              ×
            </button>
          </div>
        ))
      ) : (
        <div className="compact-empty">
          <h3>Ainda sem registos</h3>
          <p className="subtle">
            Regista aqui os trabalhos que fizeste fora da GlobalOps.
          </p>
        </div>
      )}
    </>
  );
}
