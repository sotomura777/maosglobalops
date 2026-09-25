import { useEffect, useState, useRef } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../App";
import { useMarket } from "./context";
import {
  watchJobs,
  saveJob,
  apply,
  getJob,
  watchJob,
  publishJob,
  closeJob,
  saveDraft,
  getDraft,
  getCompanyStatus,
} from "./service";
import {
  payLabel,
  dateLabel,
  today,
  validateJob,
  estimatePay,
  money,
  matchesJob,
  emptyJob,
  jobForm,
} from "./model";
import { CATEGORIES, DISTRICTS } from "../constants";
import { CompanyMark } from "../ui";
import { Heading, Empty, ErrorBox, Field, Icon } from "./Layout";
import { ReportButton } from "./Report";
export function JobCard({ job }) {
  const { user, profile } = useAuth();
  const { saved, applications } = useMarket();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const hasApplied = applications.some((a) => a.jobId === job.id);
  const isSaved = saved.includes(job.id);
  const estimate = estimatePay(job);
  return (
    <article className="panel job-card">
      <div className="row between">
        <Link
          className="row"
          to={`/app/profissionais/${job.companyId}`}
          style={{ textDecoration: "none" }}
        >
          <CompanyMark name={job.companyName} color={job.brandColor} />
          <span className="subtle">{job.companyName}</span>
        </Link>
        {profile.kind === "worker" && (
          <button
            className="icon-button"
            aria-label={isSaved ? "Retirar dos guardados" : "Guardar oferta"}
            aria-pressed={isSaved}
            disabled={busy}
            style={{ color: isSaved ? "var(--gold)" : undefined }}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await saveJob(user.uid, job.id, isSaved);
              } catch {
                setError("Não foi possível guardar a oferta.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Icon name="bookmark" fill={isSaved ? "currentColor" : "none"} />
          </button>
        )}
      </div>
      <div>
        <h3>
          <Link to={`/app/trabalhos/${job.id}`}>{job.title}</Link>
        </h3>
        <div className="meta">
          {job.district} · {dateLabel(job.date)}
          {job.startTime ? ` · ${job.startTime}–${job.endTime}` : ""}
        </div>
      </div>
      <div className="job-pay">
        <strong>{estimate ? money(estimate.total) : payLabel(job)}</strong>
        <span>
          {estimate?.estimated
            ? `estimados · ${payLabel(job)} · ${estimate.hours.toLocaleString("pt-PT")} h`
            : estimate
              ? "por serviço"
              : ""}
        </span>
      </div>
      <div className="row wrap">
        {job.category && <span className="tag">{job.category}</span>}
        {job.vacancies && (
          <span className="tag">
            {job.vacancies} {job.vacancies === 1 ? "vaga" : "vagas"}
          </span>
        )}
        {hasApplied && <span className="tag green">Candidatura enviada</span>}
      </div>
      <div className="job-card-footer">
        <span className="subtle">{job.meal || job.companyName}</span>
        <Link className="btn secondary" to={`/app/trabalhos/${job.id}`}>
          Ver trabalho <Icon name="arrow" width="15" />
        </Link>
      </div>
      <ErrorBox>{error}</ErrorBox>
    </article>
  );
}
export function Explore() {
  const { profile } = useAuth();
  const { saved } = useMarket();
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useSearchParams();
  const dialog = useRef(null);
  const filters = Object.fromEntries(
    ["q", "category", "district", "date", "rate", "payType", "saved"].map(
      (k) => [k, search.get(k) || ""],
    ),
  );
  const update = (k, value) => {
    const params = new URLSearchParams(search);
    value ? params.set(k, value) : params.delete(k);
    setSearch(params, { replace: true });
  };
  const field = (k) => ({
    value: filters[k],
    onChange: (e) => update(k, e.target.value),
  });
  useEffect(
    () =>
      watchJobs(setJobs, () =>
        setError(
          "Não foi possível carregar as ofertas. Tenta novamente mais tarde.",
        ),
      ),
    [],
  );
  const visible = (jobs || []).filter(
    (j) => matchesJob(j, filters) && (!filters.saved || saved.includes(j.id)),
  );
  const active = ["category", "district", "date", "rate", "payType"].filter(
    (k) => filters[k],
  );
  const labels = {
    category: filters.category,
    district: filters.district,
    date: dateLabel(filters.date),
    rate: `Desde ${filters.rate} €`,
    payType: filters.payType === "hour" ? "Por hora" : "Por serviço",
  };
  return (
    <>
      <Heading eyebrow="Mercado aberto" title="Explorar trabalhos">
        Escolhe onde e quando queres trabalhar.
      </Heading>
      <div className="search-toolbar">
        <Field label="Pesquisar">
          <input
            placeholder="Função, empresa ou palavra-chave"
            {...field("q")}
          />
        </Field>
        <button
          className="btn secondary"
          onClick={() => dialog.current.showModal()}
        >
          Filtros{active.length ? ` (${active.length})` : ""}
        </button>
        <button
          className={`icon-button ${filters.saved ? "selected" : ""}`}
          aria-label="Guardados"
          aria-pressed={!!filters.saved}
          onClick={() => update("saved", filters.saved ? "" : "1")}
        >
          <Icon name="bookmark" />
        </button>
      </div>
      <div className="filter-chips">
        {active.map((k) => (
          <button
            key={k}
            className="tag"
            aria-label={`Remover filtro ${labels[k]}`}
            onClick={() => update(k, "")}
          >
            {labels[k]} ×
          </button>
        ))}
        {!filters.district && profile.district && (
          <button
            className="tag"
            onClick={() => update("district", profile.district)}
          >
            Em {profile.district}
          </button>
        )}
        {(active.length > 0 || filters.q || filters.saved) && (
          <button
            className="quiet"
            onClick={() => setSearch({}, { replace: true })}
          >
            Limpar
          </button>
        )}
      </div>
      <dialog
        ref={dialog}
        className="filter-dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current.close();
        }}
      >
        <div className="stack">
          <div className="row between">
            <h2>Filtrar trabalhos</h2>
            <button
              className="icon-button"
              aria-label="Fechar filtros"
              onClick={() => dialog.current.close()}
            >
              ×
            </button>
          </div>
          <Field label="Distrito">
            <select {...field("district")}>
              <option value="">Todo o país</option>
              {DISTRICTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Função">
            <select {...field("category")}>
              <option value="">Todas as funções</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Data">
            <input type="date" {...field("date")} />
          </Field>
          <Field label="Tipo de pagamento">
            <select {...field("payType")}>
              <option value="">Todos os tipos</option>
              <option value="hour">Por hora</option>
              <option value="service">Por serviço</option>
            </select>
          </Field>
          <Field label="Valor mínimo (€)">
            <input
              type="number"
              min="0"
              placeholder="Sem mínimo"
              {...field("rate")}
            />
          </Field>
          <button className="btn gold" onClick={() => dialog.current.close()}>
            Ver {visible.length}{" "}
            {visible.length === 1 ? "trabalho" : "trabalhos"}
          </button>
        </div>
      </dialog>
      <ErrorBox>{error}</ErrorBox>
      {jobs === null && !error ? (
        <p role="status" className="subtle">
          A procurar oportunidades…
        </p>
      ) : (
        <>
          <div className="row between results-summary">
            <span className="subtle">
              {visible.length}{" "}
              {visible.length === 1 ? "oportunidade" : "oportunidades"}
              {filters.saved ? " guardadas" : ""}
            </span>
            <span className="subtle">Mais recentes</span>
          </div>
          {visible.length ? (
            <div className="grid-two">
              {visible.map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
            </div>
          ) : (
            <div className="compact-empty">
              <h3>Sem ofertas para esta pesquisa</h3>
              <p className="subtle">
                Experimenta outra zona ou remove os filtros para ver todas as
                oportunidades.
              </p>
              <button className="btn secondary" onClick={() => setSearch({})}>
                Ver todos os trabalhos
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
// Condições da oferta, iguais na página da app e na página pública partilhável.
export function JobFacts({ job }) {
  return (
    <>
      <div className="detail-grid">
        {[
          ["Pagamento", payLabel(job)],
          ["Data", dateLabel(job.date)],
          [
            "Horário",
            job.startTime
              ? `${job.startTime}–${job.endTime}${job.endTime <= job.startTime ? " (+1 dia)" : ""}`
              : "A combinar",
          ],
          ["Local", job.location || job.district],
          ["Distrito", job.district],
          [
            "Vagas disponíveis",
            job.vacancies
              ? `${Math.max(0, job.vacancies - (job.filled || 0))} de ${job.vacancies}`
              : "Não indicado",
          ],
        ].map(([l, v]) => (
          <div key={l}>
            <small>{l}</small>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <h3 className="section-title">O trabalho</h3>
      <p className="subtle" style={{ whiteSpace: "pre-wrap" }}>
        {job.description || "Sem descrição adicional."}
      </p>
      <h3 className="section-title" style={{ marginTop: 24 }}>
        Condições
      </h3>
      <div className="stack subtle">
        {[
          ["Prazo de pagamento", job.paymentTerms],
          ["Transporte", job.transport],
          ["Refeição", job.meal],
          ["Roupa e equipamento", job.equipment],
        ].map(([l, v]) => (
          <p key={l}>
            <strong>{l}: </strong>
            {v || "Não indicado — confirma com a empresa."}
          </p>
        ))}
      </div>
    </>
  );
}
// Partilhar a ligação pública da oferta: no telemóvel abre a partilha do sistema.
function ShareButton({ jobId, title }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/ofertas/${jobId}`;
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copia a ligação:", url);
    }
  };
  return (
    <button type="button" className="btn secondary" onClick={share}>
      {copied ? "Ligação copiada" : "Partilhar"}
    </button>
  );
}
export function JobDetails() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const { applications, invitations = [] } = useMarket();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    setLoading(true);
    return watchJob(
      id,
      (j) => {
        setJob(j);
        setLoading(false);
      },
      () => {
        setError("Não foi possível abrir esta oferta.");
        setLoading(false);
      },
    );
  }, [id]);
  const [companyApp, setCompanyApp] = useState(null);
  const companyId = job?.companyId;
  useEffect(() => {
    if (!companyId) return;
    let active = true;
    getCompanyStatus(companyId)
      .then((s) => active && setCompanyApp(s.app))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [companyId]);
  const application = applications.find((a) => a.jobId === id);
  if (loading) return <p role="status">A carregar trabalho…</p>;
  if (!job)
    return (
      <>
        <ErrorBox>{error}</ErrorBox>
        <Empty title="Oferta indisponível">
          Esta oferta já não está disponível.
        </Empty>
      </>
    );
  const owner = job.companyId === user.uid;
  const invited = invitations.some((i) => i.jobId === id);
  const expired = job.startAt?.toMillis
    ? job.startAt.toMillis() <= Date.now()
    : /^\d{4}-\d{2}-\d{2}$/.test(job.date) && job.date < today();
  return (
    <>
      <Link className="quiet" to="/app/trabalhos">
        ← Explorar trabalhos
      </Link>
      <Heading
        eyebrow={job.category || "Trabalho"}
        title={job.title}
        action={
          job.visibility === "private" ? (
            <span className="tag gold">Só por convite</span>
          ) : (
            <ShareButton jobId={id} title={job.title} />
          )
        }
      />
      <ErrorBox>{error}</ErrorBox>
      <div className="panel">
        <Link
          className="row"
          to={`/app/profissionais/${job.companyId}`}
          style={{ textDecoration: "none" }}
        >
          <CompanyMark name={job.companyName} />
          <div>
            <strong>{job.companyName}</strong>
            <p className="subtle">Ver perfil da empresa →</p>
          </div>
        </Link>
        <JobFacts job={job} />
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        {owner ? (
          <>
            <h3 className="section-title">Gerir oferta</h3>
            <p className="subtle" style={{ marginBottom: 16 }}>
              Encerrar impede novas candidaturas. Os trabalhos já combinados
              mantêm-se.
            </p>
            <div className="actions">
              <Link
                className="btn"
                to={`/app/meus-trabalhos?tab=pending&job=${id}`}
              >
                Ver candidaturas
              </Link>
              <Link
                className="btn secondary"
                to={`/app/publicar?duplicate=${id}`}
              >
                Duplicar oferta
              </Link>
              {job.status === "open" ? (
                <button
                  className="btn secondary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await closeJob(id);
                      setJob({ ...job, status: "closed" });
                    } catch {
                      setError("Não foi possível encerrar a oferta.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Encerrar oferta
                </button>
              ) : (
                <span className="tag">Oferta encerrada</span>
              )}
            </div>
          </>
        ) : application ? (
          <>
            <span className="tag green">Já enviaste a tua candidatura</span>
            <p className="subtle" style={{ margin: "14px 0" }}>
              Acompanha a resposta e fala com a empresa em Os meus trabalhos.
            </p>
            <Link className="btn" to={`/app/contratacoes/${application.id}`}>
              Ver candidatura
            </Link>
          </>
        ) : job.status !== "open" || expired ? (
          <Empty title="Candidaturas encerradas">
            Explora outras oportunidades disponíveis.
          </Empty>
        ) : profile.kind === "worker" ? (
          <form
            id="application-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                if (!user.emailVerified)
                  throw new Error(
                    "Confirma o email em Segurança da conta antes de te candidatares.",
                  );
                await apply(job, user, profile, message);
                navigate(`/app/contratacoes/${id}_${user.uid}`);
              } catch (e) {
                setError(e.message || "Não foi possível enviar.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <h3 className="section-title">Apresenta-te à empresa</h3>
            <Field label="Mensagem (opcional)">
              <textarea
                maxLength={2000}
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Conta porque és a pessoa certa e confirma a tua disponibilidade."
              />
            </Field>
            <p className="subtle" style={{ margin: "14px 0" }}>
              A candidatura partilha o teu nome. Se o teu perfil estiver
              público, a empresa também pode consultá-lo.
            </p>
            {companyApp && (
              <p className="notice" role="note">
                A {job.companyName} gere os trabalhos na app{" "}
                <strong>{companyApp.name}</strong>. Se fores aceite, a empresa
                cria-te uma conta de staff lá e recebe o teu nome, email e
                telefone.
              </p>
            )}
            <div className="floating-action">
              <span className="price">{payLabel(job)}</span>
              <button className="btn gold" disabled={busy}>
                {busy ? "A enviar…" : invited ? "Aceitar convite" : "Candidatar-me"}
              </button>
            </div>
          </form>
        ) : (
          <p className="subtle">
            As candidaturas estão disponíveis para contas de trabalhador.
          </p>
        )}
      </div>
      {!owner && (
        <div className="report-slot">
          <ReportButton
            targetType="job"
            targetId={id}
            label="Denunciar esta oferta"
          />
        </div>
      )}
    </>
  );
}
// Quem vê a oferta e que favoritos recebem convite. Convidar não é contratar:
// os convidados candidatam-se e a empresa escolhe.
function Audience({ form, setForm }) {
  const { favorites = [] } = useMarket();
  const invite = form.invite || [];
  const toggle = (id) =>
    setForm({
      ...form,
      invite: invite.includes(id) ? invite.filter((x) => x !== id) : [...invite, id],
    });
  return (
    <fieldset className="wide audience">
      <legend>Quem pode ver esta oferta</legend>
      <label className="choice">
        <input
          type="radio"
          name="visibility"
          checked={form.visibility !== "private"}
          onChange={() => setForm({ ...form, visibility: "public" })}
        />
        <span>
          <strong>Pública</strong>
          <small>Aparece a toda a gente no Explorar e pode ser partilhada.</small>
        </span>
      </label>
      <label className="choice">
        <input
          type="radio"
          name="visibility"
          checked={form.visibility === "private"}
          onChange={() => setForm({ ...form, visibility: "private" })}
        />
        <span>
          <strong>Privada — só convidados</strong>
          <small>Só as pessoas que convidares a veem e se podem candidatar.</small>
        </span>
      </label>
      <p className="audience-title">
        {form.visibility === "private" ? "Convidar (obrigatório)" : "Convidar favoritos (opcional)"}
      </p>
      {favorites.length ? (
        <div className="invite-list">
          {favorites.map((f) => (
            <label className="choice compact" key={f.id}>
              <input
                type="checkbox"
                checked={invite.includes(f.id)}
                onChange={() => toggle(f.id)}
              />
              <span>{f.workerName || "Profissional"}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="subtle">
          Ainda não tens favoritos. Guarda profissionais nos favoritos a partir
          do perfil deles para os poderes convidar.
        </p>
      )}
    </fieldset>
  );
}
export function NewJob() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState(() => emptyJob(profile.district || ""));
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const draftId = params.get("draft");
  const duplicate = params.get("duplicate");
  const savedDraft = useRef(null);
  useEffect(() => {
    let active = true;
    if ((!draftId && !duplicate) || (draftId && savedDraft.current === draftId))
      return;
    setLoading(true);
    (draftId ? getDraft(user.uid, draftId) : getJob(duplicate))
      .then((data) => {
        if (!active) return;
        if (!data) throw new Error("Oferta ou rascunho indisponível.");
        setForm({ ...jobForm(data), ...(duplicate ? { date: "" } : {}) });
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [draftId, duplicate, user.uid]);
  const [publishRequestId] = useState(() => crypto.randomUUID());
  const publish = async () => {
    const err = validateJob(form);
    if (err) {
      setError(err);
      setPreview(false);
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (!user.emailVerified) {
        setError("Confirma o email em Segurança da conta antes de publicar.");
        return;
      }
      const ref = await publishJob(
        form,
        user,
        profile,
        draftId,
        publishRequestId,
      );
      navigate(`/app/trabalhos/${ref.id}`);
    } catch (e) {
      setError(
        e.message || "Não foi possível publicar. O rascunho foi mantido.",
      );
    } finally {
      setBusy(false);
    }
  };
  const input = (k, props = {}) => (
    <input
      {...props}
      value={form[k]}
      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
    />
  );
  if (profile.kind !== "company")
    return (
      <Empty title="Área de empresas">
        Só empresas podem publicar ofertas.
      </Empty>
    );
  return (
    <>
      <Heading eyebrow="Encontrar profissionais" title="Publicar um trabalho">
        Dá toda a informação necessária para uma candidatura informada.
      </Heading>
      <ErrorBox>{error}</ErrorBox>
      {notice && (
        <div className="success-box" role="status">
          {notice}
        </div>
      )}
      {loading && <p role="status">A carregar rascunho…</p>}
      {preview && (
        <div className="panel stack">
          <div className="eyebrow">Pré-visualização · ainda não publicado</div>
          <h2>{form.title}</h2>
          <strong className="price">{payLabel(form)}</strong>
          <p>
            {dateLabel(form.date)} · {form.startTime}–{form.endTime} ·{" "}
            {form.vacancies} vagas
          </p>
          <p>
            {form.location} · {form.district}
          </p>
          <p style={{ whiteSpace: "pre-wrap" }}>{form.description}</p>
          <p>
            <strong>Quem vê: </strong>
            {form.visibility === "private"
              ? form.invite.length === 1
                ? "só a pessoa convidada"
                : `só as ${form.invite.length} pessoas convidadas`
              : "toda a gente"}
            {form.visibility !== "private" && form.invite?.length
              ? form.invite.length === 1
                ? " · 1 favorito recebe convite"
                : ` · ${form.invite.length} favoritos recebem convite`
              : ""}
          </p>
          {[
            ["Pagamento", form.paymentTerms],
            ["Transporte", form.transport],
            ["Refeição", form.meal],
            ["Roupa e equipamento", form.equipment],
          ].map(([label, value]) => (
            <p key={label}>
              <strong>{label}: </strong>
              {value || "Não indicado"}
            </p>
          ))}
          <div className="actions">
            <button className="btn gold" disabled={busy} onClick={publish}>
              {busy ? "A publicar…" : "Publicar oferta"}
            </button>
            <button className="btn secondary" onClick={() => setPreview(false)}>
              Continuar a editar
            </button>
          </div>
        </div>
      )}
      <form
        className="panel form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          const err =
            validateJob(form) ||
            (form.visibility === "private" && !form.invite?.length
              ? "Numa oferta privada, escolhe pelo menos uma pessoa para convidar."
              : "");
          if (err) return setError(err);
          setError("");
          setPreview(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        hidden={preview}
      >
        <div className="wide">
          <Field label="Título *">
            {input("title", {
              required: true,
              maxLength: 120,
              placeholder: "Ex.: Serviço de mesa · evento em Lisboa",
            })}
          </Field>
        </div>
        <Field label="Função *">
          <select
            required
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="">Selecionar função</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Distrito *">
          <select
            required
            value={form.district}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
          >
            <option value="">Selecionar distrito</option>
            {DISTRICTS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Local / morada *">
          {input("location", {
            required: true,
            maxLength: 250,
            placeholder: "Espaço e morada do trabalho",
          })}
        </Field>
        <Field label="Data *">
          {input("date", { type: "date", required: true, min: today() })}
        </Field>
        <Field label="Hora de início *">
          {input("startTime", { type: "time", required: true })}
        </Field>
        <Field label="Hora de fim *">
          {input("endTime", { type: "time", required: true })}
        </Field>
        {form.endTime && form.startTime && form.endTime <= form.startTime && (
          <p className="subtle wide">O horário termina no dia seguinte.</p>
        )}
        <p className="subtle wide">
          Horário local do distrito escolhido. A vaga fica ocupada quando o
          profissional confirma.
        </p>
        <Field label="Número de vagas *">
          {input("vacancies", {
            type: "number",
            required: true,
            min: 1,
            max: 1000,
            step: 1,
          })}
        </Field>
        <Field label="Valor (€) *">
          {input("rate", {
            type: "number",
            required: true,
            min: 0.01,
            step: 0.01,
          })}
        </Field>
        <Field label="Pagamento">
          <select
            value={form.payType}
            onChange={(e) => setForm({ ...form, payType: e.target.value })}
          >
            <option value="hour">Por hora</option>
            <option value="service">Por serviço</option>
          </select>
        </Field>
        <Field label="Prazo e condições de pagamento *">
          {input("paymentTerms", {
            required: true,
            maxLength: 300,
            placeholder: "Ex.: transferência até 15 dias após o serviço",
          })}
        </Field>
        <div className="wide">
          <Field label="Descrição do trabalho *">
            <textarea
              required
              maxLength={5000}
              rows={4}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Tarefas, experiência necessária e condições do serviço."
            />
          </Field>
        </div>
        <Field label="Transporte">
          {input("transport", {
            maxLength: 300,
            placeholder: "Ex.: a cargo do profissional",
          })}
        </Field>
        <Field label="Refeição">
          {input("meal", {
            maxLength: 300,
            placeholder: "Ex.: incluída no local",
          })}
        </Field>
        <div className="wide">
          <Field label="Roupa e equipamento">
            {input("equipment", {
              maxLength: 500,
              placeholder: "Ex.: camisa branca e calçado preto",
            })}
          </Field>
        </div>
        <Audience form={form} setForm={setForm} />
        <div className="wide actions">
          <button
            type="button"
            className="btn secondary"
            disabled={busy || loading}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const id = await saveDraft(user.uid, form, draftId);
                savedDraft.current = id;
                setParams({ draft: id }, { replace: true });
                setNotice(
                  "Rascunho guardado. Podes continuar mais tarde em Os meus trabalhos.",
                );
              } catch {
                setError("Não foi possível guardar o rascunho.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Guardar rascunho
          </button>
          <button className="btn gold" disabled={busy}>
            Pré-visualizar oferta
          </button>
          <Link className="btn secondary" to="/app/meus-trabalhos">
            Cancelar
          </Link>
        </div>
      </form>
    </>
  );
}
