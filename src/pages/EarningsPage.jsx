import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../App";
import {
  addWorkEntry,
  deleteWorkEntry,
  listWorkEntries,
} from "../services/workService";
import { Heading, Field, ErrorBox } from "../marketplace/Layout";
import { money, today, dateLabel } from "../marketplace/model";
export default function EarningsPage() {
  const { user } = useAuth();
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
  }, [user.uid]);
  const stats = useMemo(() => {
    const total = { hours: 0, amount: 0 };
    const month = { hours: 0, amount: 0 };
    for (const e of entries || []) {
      total.hours += e.hours;
      total.amount += e.hours * e.rate;
      if (e.date.startsWith(today().slice(0, 7))) {
        month.hours += e.hours;
        month.amount += e.hours * e.rate;
      }
    }
    return {
      total,
      month,
      average: total.hours ? total.amount / total.hours : 0,
    };
  }, [entries]);
  return (
    <>
      <Heading
        eyebrow="Registo pessoal e privado"
        title="Horas e ganhos"
        action={
          <button className="btn gold" onClick={() => setEditing(true)}>
            Registar trabalho
          </button>
        }
      >
        Acompanha os valores que registas. Não representa pagamentos processados
        pela plataforma.
      </Heading>
      <ErrorBox>{error}</ErrorBox>
      <div className="earnings-summary">
        <div>
          <small>Este mês</small>
          <strong>{money(stats.month.amount)}</strong>
          <span>{stats.month.hours} horas registadas</span>
        </div>
        <div>
          <small>Total registado</small>
          <strong>{money(stats.total.amount)}</strong>
          <span>Média de {money(stats.average)}/h</span>
        </div>
      </div>
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
        Trabalhos registados
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
            Regista o primeiro serviço para acompanhar as horas e os valores.
          </p>
        </div>
      )}
    </>
  );
}
