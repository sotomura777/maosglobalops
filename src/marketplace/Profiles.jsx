import { useEffect, useState } from "react";
import { Link, useParams, useBlocker } from "react-router-dom";
import { useAuth } from "../App";
import { listPublicProfiles, updateProfile } from "../services/profileService";
import { listValidationsFor } from "../services/workService";
import {
  getPublicProfile,
  getReviews,
  getWorkHistory,
  getHistoryClaims,
  createHistoryClaim,
  deleteHistoryClaim,
  getReputation,
  endorse,
} from "./service";
import { useMarket } from "./context";
import { dateLabel, attendanceRate } from "./model";
import { CATEGORIES, DISTRICTS, AVAILABILITY, PREFS } from "../constants";
import { initials } from "../ui";
import { Heading, Field, Empty, ErrorBox } from "./Layout";
export function Directory() {
  const [all, setAll] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [district, setDistrict] = useState("");
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    listPublicProfiles()
      .then(setAll)
      .catch(() =>
        setError(
          "Não foi possível carregar o diretório. Tenta atualizar a página.",
        ),
      );
  }, []);
  const rows = (all || []).filter(
    (p) =>
      p.kind === "worker" &&
      (!q ||
        `${p.name} ${p.headline} ${p.bio}`
          .toLowerCase()
          .includes(q.toLowerCase())) &&
      (!cat || p.categories?.includes(cat)) &&
      (!district || p.district === district) &&
      (!available || p.availability === "disponivel"),
  );
  return (
    <>
      <Heading
        eyebrow="Rede de profissionais"
        title="Encontra as pessoas certas"
      >
        Experiência, disponibilidade e funções num só lugar.
      </Heading>
      <div className="filters">
        <Field label="Pesquisar">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome ou experiência"
          />
        </Field>
        <Field label="Função">
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Todas as funções</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Distrito">
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          >
            <option value="">Todo o país</option>
            {DISTRICTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
      </div>
      <label className="row subtle" style={{ margin: "16px 0 24px" }}>
        <input
          type="checkbox"
          checked={available}
          onChange={(e) => setAvailable(e.target.checked)}
        />
        Só profissionais disponíveis
      </label>
      <ErrorBox>{error}</ErrorBox>
      {all === null && !error ? (
        <p role="status">A carregar profissionais…</p>
      ) : rows.length ? (
        <div className="grid-two">
          {rows.map((p) => (
            <Link
              to={`/app/profissionais/${p.id}`}
              className="panel notification-card"
              key={p.id}
            >
              <div className="profile-head">
                <span className="avatar" style={{ width: 48, height: 48 }}>
                  {initials(p.name)}
                </span>
                <div>
                  <h3>{p.name}</h3>
                  <p className="subtle">
                    {p.headline || "Profissional independente"}
                  </p>
                </div>
              </div>
              <div className="row wrap" style={{ margin: "18px 0" }}>
                {(p.categories || []).slice(0, 4).map((c) => (
                  <span className="tag" key={c}>
                    {c}
                  </span>
                ))}
              </div>
              <div className="row between wrap">
                <span className="subtle">
                  {p.district || "Localização por indicar"}
                </span>
                <span
                  className={`tag ${p.availability === "disponivel" ? "green" : ""}`}
                >
                  {AVAILABILITY.find((a) => a[0] === p.availability)?.[1] ||
                    "Disponibilidade por indicar"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Empty title="Sem profissionais para estes filtros">
          Experimenta outra função ou localização.
        </Empty>
      )}
    </>
  );
}
export function PublicProfile() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [vals, setVals] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [history, setHistory] = useState([]);
  const [claims, setClaims] = useState([]);
  const [rep, setRep] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      getPublicProfile(id),
      listValidationsFor(id),
      getReviews(id),
      getWorkHistory(id),
      getHistoryClaims(id).catch(() => []),
      getReputation(id).catch(() => ({})),
    ])
      .then(([p, v, r, h, c, rp]) => {
        if (active) {
          setP(p);
          setVals(v);
          setReviews(r);
          setHistory(h);
          setClaims(c);
          setRep(rp);
        }
      })
      .catch(() => {
        if (active) setError("Este perfil é privado ou não está disponível.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);
  if (loading) return <p role="status">A carregar perfil…</p>;
  if (!p)
    return (
      <>
        <ErrorBox>{error}</ErrorBox>
        <Empty title="Perfil indisponível">
          O titular controla a visibilidade do seu perfil. Podes continuar a
          conversa na candidatura.
        </Empty>
      </>
    );
  const company = p.kind === "company";
  const avg = reviews.length
    ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length
    : null;
  const rate = attendanceRate(rep);
  const hasReputation =
    (rep.completed || 0) + (rep.noShows || 0) + (rep.cancellationsTotal || 0) >
    0;
  const timeline = [
    ...history.map((h) => ({
      key: `h-${h.id}`,
      title: h.title,
      company: h.companyName,
      date: h.date,
      hours: h.hours,
      badge: h.source === "external" ? "Confirmado pela empresa" : "Verificado",
      tone: "green",
    })),
    ...claims
      // Um pedido recusado pela empresa não aparece como declaração no perfil público.
      .filter((c) => !["verified", "rejected"].includes(c.status))
      .map((c) => ({
        key: `c-${c.id}`,
        title: c.title,
        company: c.companyName,
        date: c.date,
        hours: c.hours,
        badge: c.status === "pending" ? "A aguardar confirmação" : "Auto-declarado",
        tone: "",
      })),
  ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return (
    <>
      <Heading
        eyebrow={company ? "Perfil de empresa" : "Profissional independente"}
        title={p.name}
      />
      <div className="panel">
        <div className="profile-head">
          <span
            className="avatar"
            style={{ width: 64, height: 64, fontSize: 21 }}
          >
            {initials(p.name)}
          </span>
          <div>
            <h2>
              {p.headline ||
                (company ? "Empresa na GlobalOps" : "Staff de eventos")}
            </h2>
            <p className="subtle">
              {p.district || "Localização por indicar"}
              {p.languages ? ` · ${p.languages}` : ""}
            </p>
          </div>
        </div>
        <div className="row wrap" style={{ marginTop: 20 }}>
          {company ? (
            <span className="tag">Identificação declarada pela empresa</span>
          ) : (
            <span
              className={`tag ${p.availability === "disponivel" ? "green" : ""}`}
            >
              {AVAILABILITY.find((a) => a[0] === p.availability)?.[1] ||
                "Disponibilidade por indicar"}
            </span>
          )}
          {avg && (
            <span className="tag gold">
              ★ {avg.toFixed(1)} · {reviews.length}{" "}
              {reviews.length === 1 ? "avaliação" : "avaliações"}
            </span>
          )}
        </div>
        <p className="subtle" style={{ whiteSpace: "pre-wrap", marginTop: 20 }}>
          {p.bio || "Ainda sem apresentação."}
        </p>
        <div className="row wrap" style={{ marginTop: 16 }}>
          {(p.categories || []).map((c) => (
            <span className="tag" key={c}>
              {c}
            </span>
          ))}
        </div>
        {company && p.companyLegalName && (
          <p className="subtle" style={{ marginTop: 16 }}>
            Designação: {p.companyLegalName}
          </p>
        )}
        {p.website && /^https?:\/\//i.test(p.website) && (
          <p style={{ marginTop: 12 }}>
            <a
              className="subtle"
              href={p.website}
              target="_blank"
              rel="noreferrer"
            >
              Visitar website ↗
            </a>
          </p>
        )}
        {p.phone && (
          <p style={{ marginTop: 12 }}>
            <a className="subtle" href={`tel:${p.phone}`}>
              {p.phone}
            </a>
          </p>
        )}
      </div>
      {!company && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3 className="section-title">Fiabilidade</h3>
          {hasReputation ? (
            <div className="detail-grid">
              <div>
                <small>Trabalhos concluídos</small>
                <strong>{rep.completed || 0}</strong>
              </div>
              {rate !== null && (
                <div>
                  <small>Comparência</small>
                  <strong>{rate}%</strong>
                </div>
              )}
              <div>
                <small>Faltas</small>
                <strong>{rep.noShows || 0}</strong>
              </div>
              <div>
                <small>Atrasos</small>
                <strong>{rep.late || 0}</strong>
              </div>
              <div>
                <small>Cancelamentos</small>
                <strong>
                  {rep.cancellationsTotal || 0}
                  {rep.cancellationsLate
                    ? ` (${rep.cancellationsLate} de última hora)`
                    : ""}
                </strong>
              </div>
              {avg && (
                <div>
                  <small>Avaliação média</small>
                  <strong>★ {avg.toFixed(1)}</strong>
                </div>
              )}
            </div>
          ) : (
            <p className="subtle">
              Ainda sem trabalhos concluídos na plataforma. A fiabilidade
              constrói-se a cada trabalho realizado.
            </p>
          )}
        </div>
      )}
      {!company && (p.experience || []).length > 0 && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3 className="section-title">Experiência declarada</h3>
          {p.experience.map((e, i) => (
            <div className="review" key={e.id || i}>
              <strong>
                {e.role} · {e.company}
              </strong>
              <p>
                {e.period}
                {e.note ? ` · ${e.note}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
      {vals.length > 0 && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3 className="section-title">Experiência validada</h3>
          {vals.map((v) => (
            <div className="review" key={v.id}>
              <div className="row between wrap">
                <strong>{v.companyName}</strong>
                {v.viaApp && (
                  <span className="tag gold">
                    App de origem · {v.source || "MaosOps"}
                  </span>
                )}
              </div>
              <p>
                {v.role} · {Number(v.jobs) || 1} trabalhos ·{" "}
                {Number(v.hours) || 0} horas
              </p>
            </div>
          ))}
        </div>
      )}
      {!company && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3 className="section-title">Histórico de trabalhos</h3>
          {timeline.length ? (
            timeline.map((t) => (
              <div className="review" key={t.key}>
                <div className="row between wrap">
                  <strong>{t.title}</strong>
                  <span className={`tag ${t.tone}`}>{t.badge}</span>
                </div>
                <p>
                  {t.company} · {dateLabel(t.date)}
                  {t.hours ? ` · ${t.hours} h` : ""}
                </p>
              </div>
            ))
          ) : (
            <p className="subtle" style={{ marginTop: 16 }}>
              Ainda sem trabalhos no histórico. Os trabalhos concluídos na
              plataforma aparecem aqui automaticamente.
            </p>
          )}
        </div>
      )}
      <div className="panel" style={{ marginTop: 16 }}>
        <h3 className="section-title">Avaliações de trabalhos na GlobalOps</h3>
        <p className="subtle">
          Cada avaliação corresponde a uma contratação concluída e confirmada
          pelos dois participantes.
        </p>
        {reviews.length ? (
          reviews.map((r) => (
            <div className="review" key={r.id}>
              <div className="row between">
                <span
                  style={{ color: "var(--gold)" }}
                  aria-label={`${r.rating} de 5 estrelas`}
                >
                  {"★".repeat(r.rating)}
                  {"☆".repeat(5 - r.rating)}
                </span>
                <span className="tag green">Trabalho concluído</span>
              </div>
              <p>{r.text || "Sem comentário."}</p>
            </div>
          ))
        ) : (
          <p className="subtle" style={{ marginTop: 16 }}>
            Ainda sem avaliações de contratações nesta plataforma.
          </p>
        )}
      </div>
    </>
  );
}
function PastJobsEditor({ uid, hidden }) {
  const [claims, setClaims] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({
    companyId: "",
    companyName: "",
    title: "",
    date: "",
    hours: "",
    description: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = () => getHistoryClaims(uid).then(setClaims).catch(() => {});
  useEffect(() => {
    load();
    listPublicProfiles()
      .then((all) => setCompanies(all.filter((p) => p.kind === "company")))
      .catch(() => {});
  }, [uid]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const pickCompany = (e) => {
    const c = companies.find((x) => x.id === e.target.value);
    setForm((f) => ({
      ...f,
      companyId: c?.id || "",
      companyName: c?.name || "",
    }));
  };
  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = {
        title: form.title.trim(),
        companyName: form.companyName.trim(),
      };
      if (form.companyId) data.companyId = form.companyId;
      if (form.date) data.date = form.date;
      if (form.description.trim()) data.description = form.description.trim();
      if (Number(form.hours) > 0) data.hours = Number(form.hours);
      await createHistoryClaim(uid, data);
      setForm({
        companyId: "",
        companyName: "",
        title: "",
        date: "",
        hours: "",
        description: "",
      });
      await load();
    } catch (err) {
      setError(err.message || "Não foi possível guardar.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id) => {
    await deleteHistoryClaim(uid, id).catch(() => {});
    await load();
  };
  return (
    <div hidden={hidden} className="panel">
      <h3 className="section-title">Trabalhos anteriores</h3>
      <p className="subtle" style={{ marginBottom: 16 }}>
        Adiciona trabalhos que já fizeste, na plataforma ou fora dela. Se
        escolheres uma empresa registada, ela recebe um pedido para confirmar;
        caso contrário fica como auto-declarado.
      </p>
      <ErrorBox>{error}</ErrorBox>
      {claims.map((c) => (
        <div className="review row between" key={c.id}>
          <div>
            <strong>
              {c.title} · {c.companyName}
            </strong>
            <p>
              {dateLabel(c.date)} ·{" "}
              {c.status === "verified"
                ? "Confirmado pela empresa"
                : c.status === "pending"
                  ? "A aguardar confirmação"
                  : c.status === "rejected"
                    ? "Recusado pela empresa (não aparece no perfil)"
                    : "Auto-declarado"}
            </p>
          </div>
          {c.status !== "verified" && (
            <button
              type="button"
              className="quiet"
              aria-label={`Remover ${c.title}`}
              onClick={() => remove(c.id)}
            >
              Remover
            </button>
          )}
        </div>
      ))}
      <div className="form-grid" style={{ marginTop: 16 }}>
        <Field label="Função / cargo">
          <input maxLength={120} value={form.title} onChange={set("title")} />
        </Field>
        <Field label="Empresa registada (opcional)">
          <select value={form.companyId} onChange={pickCompany}>
            <option value="">Fora da plataforma</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        {!form.companyId && (
          <Field label="Nome da empresa / evento">
            <input
              maxLength={200}
              value={form.companyName}
              onChange={set("companyName")}
            />
          </Field>
        )}
        <Field label="Data">
          <input type="date" value={form.date} onChange={set("date")} />
        </Field>
        <Field label="Horas (opcional)">
          <input
            type="number"
            min="0"
            max="10000"
            value={form.hours}
            onChange={set("hours")}
          />
        </Field>
        <Field label="Descrição (opcional)">
          <textarea
            maxLength={500}
            rows={2}
            value={form.description}
            onChange={set("description")}
          />
        </Field>
        <button
          type="button"
          className="btn secondary"
          onClick={add}
          disabled={
            busy ||
            !form.title.trim() ||
            (!form.companyId && !form.companyName.trim())
          }
        >
          {busy ? "A guardar…" : "Adicionar trabalho"}
        </button>
      </div>
    </div>
  );
}
export function EditProfile() {
  const { user, profile } = useAuth();
  const company = profile.kind === "company";
  const [form, setForm] = useState(() => ({
    name: profile.name || "",
    headline: profile.headline || "",
    bio: profile.bio || "",
    district: profile.district || "",
    phone: profile.phone || "",
    languages: profile.languages || "",
    categories: profile.categories || [],
    prefs: profile.prefs || [],
    availability: profile.availability || "disponivel",
    public: profile.public === true,
    importExperience: profile.importExperience === true,
    companyLegalName: profile.companyLegalName || "",
    website: profile.website || "",
    experience: (profile.experience || []).map(
      ({ company, role, period, note, id }) => ({
        company: company || "",
        role: role || "",
        period: period || "",
        note: note || "",
        id: id || crypto.randomUUID(),
      }),
    ),
  }));
  const [exp, setExp] = useState({
    company: "",
    role: "",
    period: "",
    note: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [section, setSection] = useState("");
  const [baseline, setBaseline] = useState(() => JSON.stringify(form));
  const dirty =
    JSON.stringify(form) !== baseline || Object.values(exp).some(Boolean);
  const blocker = useBlocker(dirty && !busy);
  useEffect(() => {
    if (blocker.state === "blocked") {
      if (
        window.confirm(
          "Tens alterações por guardar. Queres sair e descartá-las?",
        )
      )
        blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  useEffect(() => {
    const warn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const closeEditor = () => {
    if (dirty && !window.confirm("Descartar as alterações por guardar?"))
      return;
    setForm(JSON.parse(baseline));
    setExp({ company: "", role: "", period: "", note: "" });
    setSection("");
    setError("");
  };

  const change = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };
  const input = (k, props = {}) => (
    <input
      {...props}
      value={form[k]}
      onChange={(e) => change(k, e.target.value)}
    />
  );
  return (
    <>
      <Heading
        eyebrow={company ? "A tua empresa" : "A tua apresentação"}
        title={company ? "Perfil da empresa" : "O meu perfil"}
        action={
          form.public ? (
            <Link
              className="btn secondary"
              to={`/app/profissionais/${user.uid}`}
            >
              Ver perfil público
            </Link>
          ) : null
        }
      >
        Mantém os dados atualizados para facilitar o próximo trabalho.
      </Heading>
      <ErrorBox>{error}</ErrorBox>
      {saved && (
        <div className="success-box" role="status">
          Perfil guardado.
        </div>
      )}
      {!section && (
        <div className="stack profile-overview">
          <div className="panel">
            <div className="profile-head">
              <span className="avatar">{initials(form.name)}</span>
              <div>
                <h2>{form.name}</h2>
                <p className="subtle">
                  {form.headline || "Adiciona uma apresentação curta"}
                </p>
              </div>
            </div>
            <p style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>
              {form.bio || "Conta às empresas um pouco sobre ti."}
            </p>
            <p className="subtle">
              {form.district}
              {form.languages ? ` · ${form.languages}` : ""}
            </p>
            <button className="btn secondary" onClick={() => setSection("bio")}>
              Editar apresentação
            </button>
          </div>
          {!company && (
            <div className="panel">
              <div className="row between wrap">
                <h3>Funções e disponibilidade</h3>
                <span className="tag green">
                  {AVAILABILITY.find((a) => a[0] === form.availability)?.[1]}
                </span>
              </div>
              <div className="filter-chips">
                {form.categories.map((c) => (
                  <span key={c} className="tag">
                    {c}
                  </span>
                ))}
              </div>
              <button
                className="btn secondary"
                onClick={() => setSection("skills")}
              >
                Editar disponibilidade e funções
              </button>
            </div>
          )}
          {!company && (
            <div className="panel">
              <h3>Experiência declarada</h3>
              {form.experience.length ? (
                form.experience.map((e) => (
                  <p className="subtle" key={e.id}>
                    {e.role} · {e.company} · {e.period}
                  </p>
                ))
              ) : (
                <p className="subtle">
                  Adiciona experiência relevante para os próximos trabalhos.
                </p>
              )}
              <button
                className="btn secondary"
                onClick={() => setSection("experience")}
              >
                Editar experiência
              </button>
            </div>
          )}
          <div className="panel">
            <h3>
              {form.public ? "Perfil visível na GlobalOps" : "Perfil privado"}
            </h3>
            <p className="subtle">
              {form.public
                ? "Os utilizadores autenticados podem consultar a tua apresentação e experiência. O email e o telefone são privados."
                : "O teu perfil não aparece no diretório. Podes candidatar-te e conversar com as empresas."}
            </p>
            <button
              className="btn secondary"
              onClick={() => setSection("visibility")}
            >
              Gerir visibilidade
            </button>
          </div>
          <div className="actions">
            <Link className="btn secondary" to="/app/ganhos">
              Horas e ganhos
            </Link>
            <Link className="btn secondary" to="/app/canais">
              Comunidade
            </Link>
            <Link className="btn secondary" to="/app/ranking">
              Ranking
            </Link>
          </div>
        </div>
      )}
      <form
        hidden={!section}
        className="stack profile-editor"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setSaved(false);
          if (!form.name.trim()) {
            setError("Indica o nome.");
            setBusy(false);
            return;
          }
          if (form.website && !/^https?:\/\//i.test(form.website)) {
            setError("O website deve começar por https:// ou http://.");
            setBusy(false);
            return;
          }
          if (
            Object.values(exp).some(Boolean) &&
            (!exp.company.trim() ||
              !exp.role.trim() ||
              form.experience.length >= 50)
          ) {
            setError(
              form.experience.length >= 50
                ? "Podes guardar até 50 experiências."
                : "Indica a empresa e a função da experiência antes de guardar.",
            );
            setBusy(false);
            return;
          }
          try {
            let data = { ...form, name: form.name.trim() };
            if (Object.values(exp).some(Boolean)) {
              data.experience = [
                ...data.experience,
                { ...exp, id: crypto.randomUUID() },
              ];
            }
            await updateProfile(user.uid, data);
            setForm(data);
            setBaseline(JSON.stringify(data));
            setExp({ company: "", role: "", period: "", note: "" });
            setSection("");
            setSaved(true);
          } catch {
            setError("Não foi possível guardar o perfil. Tenta novamente.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div hidden={section !== "bio"} className="panel form-grid">
          <Field label={company ? "Nome da empresa *" : "Nome *"}>
            {input("name", { required: true, maxLength: 120 })}
          </Field>
          <Field label={company ? "Atividade / setor" : "Apresentação curta"}>
            {input("headline", {
              maxLength: 160,
              placeholder: company
                ? "Ex.: Produção de eventos e catering"
                : "Ex.: Mesa e bar · eventos e restauração",
            })}
          </Field>
          {company && (
            <Field label="Designação da empresa">
              {input("companyLegalName", { maxLength: 200 })}
            </Field>
          )}
          {company && (
            <Field label="Website">
              {input("website", {
                type: "url",
                placeholder: "https://",
                maxLength: 500,
              })}
            </Field>
          )}
          <div className="wide">
            <Field label={company ? "Sobre a empresa" : "Sobre ti"}>
              <textarea
                rows={4}
                maxLength={2500}
                value={form.bio}
                onChange={(e) => change("bio", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Distrito">
            <select
              value={form.district}
              onChange={(e) => change("district", e.target.value)}
            >
              <option value="">Selecionar distrito</option>
              {DISTRICTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Telefone (privado)">
            {input("phone", { type: "tel", maxLength: 30 })}
          </Field>
          {!company && (
            <Field label="Línguas">
              {input("languages", {
                maxLength: 100,
                placeholder: "Ex.: Português, Inglês",
              })}
            </Field>
          )}
        </div>
        {!company && (
          <>
            <div hidden={section !== "skills"} className="panel">
              <h3 className="section-title">Funções e disponibilidade</h3>
              <div className="tabs">
                {CATEGORIES.map((c) => (
                  <button
                    type="button"
                    aria-pressed={form.categories.includes(c)}
                    className={form.categories.includes(c) ? "active" : ""}
                    key={c}
                    onClick={() =>
                      change(
                        "categories",
                        form.categories.includes(c)
                          ? form.categories.filter((x) => x !== c)
                          : [...form.categories, c],
                      )
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
              <Field label="Disponibilidade atual">
                <select
                  value={form.availability}
                  onChange={(e) => change("availability", e.target.value)}
                >
                  {AVAILABILITY.map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="tabs" style={{ marginTop: 18, marginBottom: 0 }}>
                {PREFS.map((p) => (
                  <button
                    type="button"
                    aria-pressed={form.prefs.includes(p)}
                    className={form.prefs.includes(p) ? "active" : ""}
                    key={p}
                    onClick={() =>
                      change(
                        "prefs",
                        form.prefs.includes(p)
                          ? form.prefs.filter((x) => x !== p)
                          : [...form.prefs, p],
                      )
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div hidden={section !== "experience"} className="panel">
              <h3 className="section-title">Experiência declarada</h3>
              <p className="subtle" style={{ marginBottom: 16 }}>
                As validações importadas das apps das empresas mantêm-se
                separadas e não são editáveis aqui.
              </p>
              {form.experience.map((x) => (
                <div className="review row between" key={x.id}>
                  <div>
                    <strong>
                      {x.role} · {x.company}
                    </strong>
                    <p>{x.period}</p>
                  </div>
                  <button
                    type="button"
                    className="quiet"
                    aria-label={`Remover experiência em ${x.company}`}
                    onClick={() =>
                      change(
                        "experience",
                        form.experience.filter((e) => e.id !== x.id),
                      )
                    }
                  >
                    Remover
                  </button>
                </div>
              ))}
              <div className="form-grid" style={{ marginTop: 16 }}>
                {[
                  ["company", "Empresa / evento"],
                  ["role", "Função"],
                  ["period", "Período"],
                  ["note", "Nota"],
                ].map(([k, l]) => (
                  <Field key={k} label={l}>
                    <input
                      maxLength={250}
                      value={exp[k]}
                      onChange={(e) => setExp({ ...exp, [k]: e.target.value })}
                    />
                  </Field>
                ))}
              </div>
              <button
                type="button"
                className="btn secondary"
                style={{ marginTop: 16 }}
                disabled={
                  !exp.company.trim() ||
                  !exp.role.trim() ||
                  form.experience.length >= 50
                }
                onClick={() => {
                  change("experience", [
                    ...form.experience,
                    { ...exp, id: crypto.randomUUID() },
                  ]);
                  setExp({ company: "", role: "", period: "", note: "" });
                }}
              >
                Adicionar experiência
              </button>
            </div>
            <PastJobsEditor uid={user.uid} hidden={section !== "experience"} />
          </>
        )}
        <div hidden={section !== "visibility"} className="panel">
          <h3 className="section-title">Visibilidade</h3>
          <p>
            <Link to="/app/conta">
              Segurança da conta e confirmação de email
            </Link>
          </p>
          {!company && (
            <label className="row subtle">
              <input
                type="checkbox"
                checked={form.importExperience}
                onChange={(e) => change("importExperience", e.target.checked)}
              />
              Autorizar a associação de experiência das apps de empresas pelo
              meu email verificado
            </label>
          )}
          <p className="subtle">
            A associação exige confirmação do email. Desativar impede novas
            sincronizações; os comprovativos já importados ficam guardados.
          </p>
          <label className="row subtle">
            <input
              type="checkbox"
              checked={form.public}
              onChange={(e) => change("public", e.target.checked)}
            />
            Perfil visível a utilizadores da GlobalOps
          </label>
          <p className="subtle" style={{ marginTop: 12 }}>
            O email, o telefone, as conversas e os registos de ganhos são
            privados. As validações importadas acompanham a visibilidade do
            perfil. As avaliações de trabalhos continuam visíveis na plataforma.
          </p>
        </div>
        <div className="floating-action">
          <span className="subtle">
            {dirty ? "Alterações por guardar" : "Sem alterações"}
          </span>
          <div className="actions">
            <button
              type="button"
              className="btn secondary"
              onClick={closeEditor}
            >
              Voltar ao perfil
            </button>
            <button className="btn gold" disabled={busy || !dirty}>
              {busy ? "A guardar…" : "Guardar perfil"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
export function Approvals() {
  const { approvals = [] } = useMarket();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const decide = async (c, decision) => {
    setBusy(c.id + decision);
    setError("");
    try {
      await endorse(c.workerId, c.id, decision);
    } catch (e) {
      setError(e.message || "Não foi possível processar o pedido.");
    } finally {
      setBusy("");
    }
  };
  return (
    <>
      <Heading eyebrow="Área da empresa" title="Pedidos de confirmação" />
      <p className="subtle">
        Profissionais pediram-te para confirmar trabalhos que fizeram contigo.
        Ao confirmar, a entrada fica verificada no currículo deles.
      </p>
      <ErrorBox>{error}</ErrorBox>
      {approvals.length ? (
        approvals.map((c) => (
          <div className="panel" key={c.id} style={{ marginTop: 16 }}>
            <div className="row between wrap">
              <div>
                <strong>{c.title}</strong>
                <p className="subtle">
                  {c.companyName} · {dateLabel(c.date)}
                  {c.hours ? ` · ${c.hours} h` : ""}
                </p>
                {c.description && <p className="subtle">{c.description}</p>}
              </div>
              <Link className="quiet" to={`/app/profissionais/${c.workerId}`}>
                Ver perfil →
              </Link>
            </div>
            <div className="actions" style={{ marginTop: 12 }}>
              <button
                className="btn gold"
                disabled={!!busy}
                onClick={() => decide(c, "approve")}
              >
                Confirmar trabalho
              </button>
              <button
                className="btn secondary"
                disabled={!!busy}
                onClick={() => decide(c, "reject")}
              >
                Recusar
              </button>
            </div>
          </div>
        ))
      ) : (
        <Empty title="Sem pedidos pendentes">
          Quando um profissional indicar que trabalhou contigo, o pedido de
          confirmação aparece aqui.
        </Empty>
      )}
    </>
  );
}
