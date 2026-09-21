import { useJobDetails } from "./useJobs";
import { useEffect, useState, useRef } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../App";
import { useMarket } from "./context";
import { Heading, Empty, ErrorBox, Field, Icon } from "./Layout";
import {
  STATUS,
  actionsFor,
  dateLabel,
  payLabel,
  statusFor,
  needsResponse,
  timestampMillis,
  isLateCancel,
} from "./model";
import {
  watchOwnJobs,
  transition,
  watchMessages,
  sendMessage,
  getJob,
  review,
  getReviews,
  markRead,
  watchDrafts,
  deleteDraft,
  getPublicProfile,
} from "./service";
export function ApplicationCard({ a, job }) {
  const { profile } = useAuth();
  const company = profile.kind === "company";
  const [candidate, setCandidate] = useState(null);
  useEffect(() => {
    let active = true;
    if (company)
      getPublicProfile(a.workerId)
        .then((p) => {
          if (active) setCandidate(p);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [company, a.workerId]);
  return (
    <Link className="panel notification-card" to={`/app/contratacoes/${a.id}`}>
      <div className="row between wrap">
        <span
          className={`tag ${a.status === "completed" ? "green" : ["accepted", "confirmed", "completion_requested"].includes(a.status) ? "gold" : ""}`}
        >
          {statusFor(a, company)}
        </span>
        <Icon name="arrow" width="17" />
      </div>
      <h3 style={{ fontSize: 17, margin: "13px 0 5px" }}>{a.title}</h3>
      <p className="subtle">{company ? a.workerName : a.companyName}</p>
      {job && (
        <p className="work-meta">
          {dateLabel(job.date)}
          {job.startTime ? ` · ${job.startTime}–${job.endTime}` : ""} ·{" "}
          {payLabel(job)}
        </p>
      )}
      {company && candidate && (
        <p className="subtle">
          {(candidate.categories || []).join(" · ")}
          {candidate.availability === "disponivel" ? " · Disponível" : ""}
          {candidate.headline ? ` — ${candidate.headline}` : ""}
        </p>
      )}
    </Link>
  );
}
export function MyWork() {
  const { user, profile } = useAuth();
  const { applications, loading } = useMarket();
  const company = profile.kind === "company";
  const [search, setSearch] = useSearchParams();
  const tab = search.get("tab") || (company ? "offers" : "active");
  const jobId = search.get("job");
  const [jobs, setJobs] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [error, setError] = useState("");
  const details = useJobDetails(applications);
  useEffect(() => {
    if (!company) return;
    const fail = () => setError("Não foi possível carregar as ofertas.");
    const stop = watchOwnJobs(user.uid, setJobs, fail);
    const stopDrafts = watchDrafts(user.uid, setDrafts, fail);
    return () => {
      stop();
      stopDrafts();
    };
  }, [company, user.uid]);
  const group = applications.filter((a) => !jobId || a.jobId === jobId);
  const rowsFor = (id) =>
    group.filter((a) =>
      id === "pending"
        ? needsResponse(a, company)
        : id === "waiting"
          ? company
            ? a.status === "accepted"
            : a.status === "pending"
          : id === "history"
            ? ["completed", "cancelled", "rejected"].includes(a.status)
            : ["confirmed", "completion_requested"].includes(a.status),
    );
  const tabs = [
    ...(company
      ? [
          ["offers", "Ofertas"],
          ["drafts", "Rascunhos"],
        ]
      : []),
    ["pending", company ? "Por analisar" : "A tua resposta"],
    ["waiting", company ? "Aguardar profissional" : "Aguardar empresa"],
    ["active", "Confirmados"],
    ["history", "Histórico"],
  ];
  return (
    <>
      <Heading
        eyebrow={company ? "Área da empresa" : "A tua atividade"}
        title="Os meus trabalhos"
        action={
          company ? (
            <Link className="btn gold" to="/app/publicar">
              + Publicar trabalho
            </Link>
          ) : (
            <Link className="btn secondary" to="/app/trabalhos">
              Explorar ofertas
            </Link>
          )
        }
      >
        Vê o que está combinado e o que precisa de resposta.
      </Heading>
      {jobId && (
        <div className="setup-strip">
          <strong>
            {details[jobId]?.title ||
              jobs.find((j) => j.id === jobId)?.title ||
              "Candidatos desta oferta"}
          </strong>
          <button
            className="quiet"
            onClick={() => {
              const p = new URLSearchParams(search);
              p.delete("job");
              setSearch(p);
            }}
          >
            Ver todos os trabalhos ×
          </button>
        </div>
      )}
      <div className="tabs work-tabs">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => {
              const p = new URLSearchParams(search);
              p.set("tab", id);
              if (id === "offers" || id === "drafts") p.delete("job");
              setSearch(p);
            }}
          >
            {label}
            <span className="tab-count">
              {id === "offers"
                ? jobs.length
                : id === "drafts"
                  ? drafts.length
                  : rowsFor(id).length}
            </span>
          </button>
        ))}
      </div>
      <ErrorBox>{error}</ErrorBox>
      {tab === "offers" ? (
        <div className="stack">
          {jobs.length ? (
            jobs.map((j) => {
              const apps = applications.filter((a) => a.jobId === j.id);
              const confirmed = apps.filter((a) =>
                ["confirmed", "completion_requested", "completed"].includes(
                  a.status,
                ),
              ).length;
              return (
                <article className="panel" key={j.id}>
                  <div className="row between wrap">
                    <h3>{j.title}</h3>
                    <span className="tag">
                      {j.status === "open" ? "Aberta" : "Encerrada"}
                    </span>
                  </div>
                  <p className="work-meta">
                    {dateLabel(j.date)} · {j.district} · {payLabel(j)}
                  </p>
                  <div className="offer-counts">
                    <span>
                      <b>{j.vacancies || "—"}</b> vagas anunciadas
                    </span>
                    <span>
                      <b>{confirmed}</b> confirmados
                    </span>
                    <span>
                      <b>{apps.filter((a) => a.status === "pending").length}</b>{" "}
                      por analisar
                    </span>
                  </div>
                  <div className="actions">
                    <Link
                      className="btn"
                      to={`/app/meus-trabalhos?tab=pending&job=${j.id}`}
                    >
                      Ver candidatos
                    </Link>
                    <Link
                      className="btn secondary"
                      to={`/app/trabalhos/${j.id}`}
                    >
                      Gerir oferta
                    </Link>
                    <Link
                      className="quiet"
                      to={`/app/publicar?duplicate=${j.id}`}
                    >
                      Duplicar
                    </Link>
                  </div>
                </article>
              );
            })
          ) : (
            <Empty title="Ainda não publicaste ofertas">
              Cria uma oferta ou prepara um rascunho para mais tarde.
            </Empty>
          )}
        </div>
      ) : tab === "drafts" ? (
        <div className="stack">
          {drafts.length ? (
            drafts.map((d) => (
              <article className="panel" key={d.id}>
                <h3>{d.form.title || "Rascunho sem título"}</h3>
                <p className="subtle">
                  Ainda não está visível aos profissionais.
                </p>
                <div className="actions">
                  <Link className="btn" to={`/app/publicar?draft=${d.id}`}>
                    Continuar rascunho
                  </Link>
                  <button
                    className="quiet"
                    onClick={async () => {
                      if (!window.confirm("Eliminar este rascunho?")) return;
                      try {
                        await deleteDraft(user.uid, d.id);
                      } catch {
                        setError("Não foi possível eliminar o rascunho.");
                      }
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))
          ) : (
            <Empty title="Sem rascunhos">
              Podes guardar uma oferta incompleta e voltar a ela mais tarde.
            </Empty>
          )}
        </div>
      ) : loading ? (
        <p role="status">A carregar trabalhos…</p>
      ) : rowsFor(tab).length ? (
        <div className="grid-two">
          {rowsFor(tab).map((a) => (
            <ApplicationCard key={a.id} a={a} job={details[a.jobId]} />
          ))}
        </div>
      ) : (
        <div className="compact-empty">
          <h3>
            {tab === "pending"
              ? "Tudo em dia — nenhuma resposta pendente"
              : tab === "active"
                ? "Ainda sem trabalhos confirmados"
                : "Sem trabalhos nesta lista"}
          </h3>
          <p className="subtle">
            As candidaturas e serviços aparecem aqui à medida que avançam.
          </p>
          {!company && (
            <Link className="btn secondary" to="/app/trabalhos">
              Explorar trabalhos
            </Link>
          )}
        </div>
      )}
    </>
  );
}
export function Engagement() {
  const { id } = useParams();
  return <EngagementView key={id} />;
}
function EngagementView() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const chatView = search.get("view") === "chat";
  const { user } = useAuth();
  const { applications, loading } = useMarket();
  const a = applications.find((x) => x.id === id);
  const [job, setJob] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [next, setNext] = useState("");
  const [attendance, setAttendance] = useState("present");
  const [lateMinutes, setLateMinutes] = useState("");
  const [rating, setRating] = useState("5");
  const [reviewText, setReviewText] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const end = useRef(null);
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!a) return;
    return watchMessages(a.id, setMessages, () =>
      setError("Não foi possível carregar as mensagens."),
    );
  }, [a?.id]);
  useEffect(() => {
    if (!a) return;
    let active = true;
    getJob(a.jobId)
      .then((j) => {
        if (active) setJob(j);
      })
      .catch(() =>
        setError("Não foi possível carregar os detalhes do trabalho."),
      );
    return () => {
      active = false;
    };
  }, [a?.jobId]);
  useEffect(() => {
    if (!a) return;
    markRead(user.uid, a.id).catch(() => {});
    if (chatView) markRead(user.uid, `chat-${a.id}`).catch(() => {});
  }, [a?.id, a?.updatedAt?.toMillis?.(), user.uid, chatView]);
  useEffect(() => {
    if (a?.status !== "completed") return;
    getReviews(user.uid === a.companyId ? a.workerId : a.companyId)
      .then((r) => {
        setReviewed(
          r.some((r) => r.engagementId === id && r.authorId === user.uid),
        );
        setReviewsLoaded(true);
      })
      .catch(() => setError("Não foi possível consultar as avaliações."));
  }, [a?.status, id, user.uid]);
  useEffect(() => {
    if (chatView) end.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length, chatView]);
  useEffect(() => {
    if (!a?.lastMessageAt || !end.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting)
          markRead(user.uid, `chat-${a.id}`).catch(() => {});
      },
      { rootMargin: "0px 0px -80px 0px" },
    );
    observer.observe(end.current);
    return () => observer.disconnect();
  }, [a?.id, a?.lastMessageAt?.toMillis?.(), messages.length, user.uid]);
  if (loading) return <p role="status">A carregar candidatura…</p>;
  if (!a)
    return (
      <Empty title="Candidatura indisponível">
        Só o trabalhador e a empresa desta contratação podem consultá-la.
      </Empty>
    );
  const company = a.companyId === user.uid;
  const steps = [
    "pending",
    "accepted",
    "confirmed",
    "completion_requested",
    "completed",
  ];
  const index = steps.indexOf(a.status);
  const agreed = a.agreedTerms;
  const endMs = agreed?.endMs || timestampMillis(job?.endAt);
  const canComplete = endMs > 0 && endMs <= Math.max(clock, Date.now());
  return (
    <>
      <Link className="quiet" to="/app/meus-trabalhos">
        ← Os meus trabalhos
      </Link>
      <Heading eyebrow="A tua contratação" title={a.title}>
        <Link to={`/app/profissionais/${company ? a.workerId : a.companyId}`}>
          {company ? a.workerName : a.companyName} · Ver perfil →
        </Link>
      </Heading>
      <ErrorBox>{error}</ErrorBox>
      <div className="panel">
        <div className="row between wrap">
          <span
            className={`tag ${a.status === "completed" ? "green" : "gold"}`}
          >
            {STATUS[a.status]}
          </span>
          <Link className="quiet" to={`/app/trabalhos/${a.jobId}`}>
            Ver oferta completa →
          </Link>
        </div>
        {index >= 0 && (
          <div className="progress-steps">
            {[
              "Candidatura",
              "Aceitação",
              "Confirmação",
              "Realização",
              "Conclusão",
            ].map((s, i) => (
              <span key={s} className={i <= index ? "reached" : ""}>
                {s}
              </span>
            ))}
          </div>
        )}
        {job && (
          <div className="detail-grid">
            {[
              ["Data", dateLabel(job.date)],
              [
                "Horário",
                job.startTime
                  ? `${job.startTime}–${job.endTime}`
                  : "A combinar",
              ],
              ["Pagamento", payLabel(job)],
            ].map(([l, v]) => (
              <div key={l}>
                <small>{l}</small>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
        )}
        {agreed && (
          <p className="subtle">
            Condições aceites: {dateLabel(agreed.date)} · {agreed.startTime}–
            {agreed.endTime} ({agreed.timeZone}) · {payLabel(agreed)} ·
            pagamento: {agreed.paymentTerms}.
          </p>
        )}
        {a.status === "confirmed" && company && !canComplete && (
          <p className="subtle">
            Podes assinalar a realização depois do fim do horário combinado.
          </p>
        )}
        {a.message && (
          <p
            className="subtle"
            style={{ whiteSpace: "pre-wrap", marginBottom: 16 }}
          >
            <strong>Candidatura: </strong>
            {a.message}
          </p>
        )}
        {a.note && (
          <p className="subtle" style={{ marginBottom: 16 }}>
            <strong>Nota da última alteração: </strong>
            {a.note}
          </p>
        )}
        {a.attendance?.status === "late" && (
          <p className="subtle" style={{ marginBottom: 16 }}>
            <strong>Presença: </strong>
            chegada com {a.attendance.lateMinutes} min de atraso.
          </p>
        )}
        {a.status === "accepted" && (
          <p className="subtle" style={{ marginBottom: 16 }}>
            {company
              ? "A proposta foi enviada. A vaga fica garantida quando o profissional confirmar, enquanto houver vagas e antes do início."
              : "A empresa aceitou a tua candidatura. A vaga fica garantida ao confirmares, enquanto houver vagas e antes do início. Verificamos se o horário coincide com outro trabalho teu."}
          </p>
        )}
        {a.status === "completion_requested" && (
          <p className="subtle" style={{ marginBottom: 16 }}>
            {company
              ? "O trabalhador recebeu o pedido de confirmação."
              : "A empresa assinalou o serviço como realizado. Confirma a conclusão ou pede uma correção pela conversa."}
          </p>
        )}
        {a.status === "confirmed" && (
          <div className="actions work-primary">
            <Link className="btn" to={`/app/contratacoes/${a.id}?view=chat`}>
              Abrir conversa
            </Link>
            {job?.location && (
              <a
                className="btn secondary"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.location + ", " + job.district)}`}
                target="_blank"
                rel="noreferrer"
              >
                Ver local ↗
              </a>
            )}
          </div>
        )}
        <div className="actions">
          {actionsFor(a.status, company)
            .filter(
              ([state]) =>
                !(a.status === "confirmed" && state === "cancelled") &&
                !(
                  ["completion_requested", "no_show"].includes(state) &&
                  !canComplete
                ),
            )
            .map(([state, label]) => (
              <button
                className={`btn ${["cancelled", "rejected"].includes(state) ? "secondary" : "gold"}`}
                disabled={busy}
                key={state}
                onClick={() => {
                  setNext(state);
                  setNote("");
                  setAttendance("present");
                  setLateMinutes("");
                }}
              >
                {label}
              </button>
            ))}
        </div>
        {a.status === "confirmed" && (
          <details className="secondary-actions">
            <summary>Mais opções</summary>
            <button
              className="quiet"
              disabled={busy}
              onClick={() => {
                setNext("cancelled");
                setNote("");
              }}
            >
              Cancelar trabalho
            </button>
          </details>
        )}
        {next && (
          <form
            className="stack"
            style={{
              marginTop: 22,
              borderTop: "1px solid var(--border)",
              paddingTop: 20,
            }}
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await transition(
                  a,
                  next,
                  user.uid,
                  note,
                  next === "completion_requested"
                    ? {
                        attendance,
                        lateMinutes:
                          attendance === "late"
                            ? Number(lateMinutes)
                            : undefined,
                      }
                    : {},
                );
                setNext("");
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <strong>
              {actionsFor(a.status, company).find(([s]) => s === next)?.[1]}
            </strong>
            {!company && next === "cancelled" && isLateCancel(a) && (
              <p className="subtle" style={{ color: "var(--danger, #b3261e)" }}>
                Faltam menos de 24h para o início — este cancelamento fica
                registado como cancelamento tardio no teu histórico.
              </p>
            )}
            {next === "confirmed" && a.status === "accepted" && (
              <label className="row subtle">
                <input type="checkbox" required />
                Aceito o horário, o local, o valor e o prazo de pagamento
                apresentados nesta oferta.
              </label>
            )}
            {next === "completion_requested" && (
              <fieldset
                className="stack"
                style={{ border: "none", padding: 0, margin: 0 }}
              >
                <legend className="subtle">Como correu a presença?</legend>
                <label className="row subtle">
                  <input
                    type="radio"
                    name="attendance"
                    checked={attendance === "present"}
                    onChange={() => setAttendance("present")}
                  />
                  Compareceu a horas
                </label>
                <label className="row subtle">
                  <input
                    type="radio"
                    name="attendance"
                    checked={attendance === "late"}
                    onChange={() => setAttendance("late")}
                  />
                  Chegou atrasado
                </label>
                {attendance === "late" && (
                  <Field label="Minutos de atraso">
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      required
                      value={lateMinutes}
                      onChange={(e) => setLateMinutes(e.target.value)}
                    />
                  </Field>
                )}
              </fieldset>
            )}
            <Field
              label={
                ["cancelled", "rejected", "no_show"].includes(next) ||
                (next === "confirmed" && a.status === "completion_requested")
                  ? "Motivo (obrigatório)"
                  : "Nota (opcional)"
              }
            >
              <textarea
                required={
                  ["cancelled", "rejected", "no_show"].includes(next) ||
                  (next === "confirmed" && a.status === "completion_requested")
                }
                maxLength={1000}
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            <div className="actions">
              <button className="btn gold" disabled={busy}>
                {busy
                  ? "A guardar…"
                  : actionsFor(a.status, company).find(
                      ([s]) => s === next,
                    )?.[1] || "Confirmar"}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setNext("")}
              >
                Voltar
              </button>
            </div>
          </form>
        )}
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <h3 className="section-title">Conversa sobre este trabalho</h3>
        <p className="subtle">
          Privada entre ti e {company ? a.workerName : a.companyName}. Combina
          detalhes e regista aqui qualquer alteração ao horário.
        </p>
        <div className="conversation" role="log" aria-label="Mensagens">
          {messages.length === 0 && (
            <p className="subtle">
              Ainda sem mensagens. Usa esta conversa para esclarecer os detalhes
              do serviço.
            </p>
          )}
          {messages.map((m) => (
            <div
              className={`bubble ${m.senderId === user.uid ? "own" : ""}`}
              key={m.id}
            >
              <p>{m.text}</p>
              <small>
                {m.senderId === user.uid
                  ? "Tu"
                  : company
                    ? a.workerName
                    : a.companyName}{" "}
                ·{" "}
                {m.createdAt?.toDate?.().toLocaleString("pt-PT", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }) || "A enviar"}
              </small>
            </div>
          ))}
          <div ref={end} />
        </div>
        <form
          className="message-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!text.trim()) return;
            setBusy(true);
            setError("");
            try {
              await sendMessage(a, user.uid, text);
              setText("");
            } catch {
              setError(
                "Não foi possível enviar a mensagem. O texto foi mantido.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <input
            aria-label="Mensagem"
            maxLength={2000}
            placeholder="Escreve uma mensagem…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn" disabled={busy || !text.trim()}>
            Enviar
          </button>
        </form>
      </div>
      {a.status === "completed" && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3 className="section-title">Como correu o trabalho?</h3>
          {reviewed ? (
            <p className="success-box">
              A tua avaliação ficou guardada. Obrigado por partilhares a
              experiência.
            </p>
          ) : !reviewsLoaded ? (
            <p className="subtle">A carregar avaliações…</p>
          ) : (
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  await review(a, user.uid, rating, reviewText);
                  setReviewed(true);
                } catch {
                  setError(
                    "Não foi possível guardar a avaliação. Cada participante pode avaliar uma única vez.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <p className="subtle">
                A avaliação fica visível na plataforma e está associada a este
                trabalho concluído.
              </p>
              <Field label="Avaliação">
                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "estrela" : "estrelas"}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="A tua experiência">
                <textarea
                  maxLength={1500}
                  rows={3}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Pontualidade, comunicação e condições combinadas…"
                />
              </Field>
              <button className="btn gold" disabled={busy}>
                Publicar avaliação
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
export function Inbox({ notifications = false }) {
  const { applications, unread, loading } = useMarket();
  const { user, profile } = useAuth();
  const list = notifications
    ? applications.filter(
        (a) =>
          a.actorId !== user.uid ||
          (a.lastMessageBy && a.lastMessageBy !== user.uid),
      )
    : applications;
  return (
    <>
      <Heading
        eyebrow={notifications ? "A tua atividade" : "Conversas privadas"}
        title={notifications ? "Notificações" : "Mensagens"}
      >
        {notifications
          ? "Respostas, confirmações e mensagens relacionadas com os teus trabalhos."
          : "Cada conversa está ligada a uma candidatura, com os detalhes sempre à mão."}
      </Heading>
      {loading ? (
        <p role="status">A carregar…</p>
      ) : list.length ? (
        list.map((a) => (
          <Link
            className={`panel notification-card ${unread.some((x) => x.id === a.id) ? "unread" : ""}`}
            to={`/app/contratacoes/${a.id}?view=chat`}
            key={a.id}
          >
            <div className="row between">
              <strong>
                {profile.kind === "company" ? a.workerName : a.companyName}
              </strong>
              {unread.some((x) => x.id === a.id) && (
                <span className="tag gold">Novo</span>
              )}
            </div>
            <h3 style={{ fontSize: 15, margin: "10px 0 5px" }}>{a.title}</h3>
            <p className="subtle">
              {STATUS[a.status]}
              {a.lastMessageAt
                ? ` · ${a.lastMessageAt.toDate?.().toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) || ""}`
                : ""}
            </p>
            {a.lastMessageText && (
              <p className="message-preview">
                {a.lastMessageBy === user.uid ? "Tu: " : ""}
                {a.lastMessageText}
              </p>
            )}
          </Link>
        ))
      ) : (
        <Empty title={notifications ? "Tudo em dia" : "Ainda sem conversas"}>
          {notifications
            ? "As novidades das tuas contratações aparecem aqui."
            : "Envia uma candidatura ou recebe candidatos para iniciar uma conversa."}
        </Empty>
      )}
    </>
  );
}
