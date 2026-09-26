import { useState } from "react";
import { useAuth } from "../App";
import { createReport } from "./service";
import { Field } from "./Layout";

export const REPORT_REASONS = [
  ["fraude", "Burla ou pedido de dinheiro"],
  ["assedio", "Assédio ou linguagem ofensiva"],
  ["dados_falsos", "Informação falsa"],
  ["conteudo_improprio", "Conteúdo impróprio"],
  ["spam", "Spam ou publicidade"],
  ["outro", "Outro motivo"],
];

export function ReportButton({ targetType, targetId, engagementId, label = "Denunciar" }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [text, setText] = useState("");
  const [state, setState] = useState("idle");
  if (state === "sent")
    return (
      <p className="subtle" role="status">
        Obrigado. A equipa vai analisar a denúncia.
      </p>
    );
  if (!open)
    return (
      <button type="button" className="quiet report-link" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  if (!user.emailVerified)
    return (
      <p className="subtle">
        Para denunciar, confirma primeiro o teu email em Segurança da conta.
      </p>
    );
  const submit = async (e) => {
    e.preventDefault();
    setState("sending");
    try {
      await createReport(user.uid, { targetType, targetId, engagementId, reason, text });
      setState("sent");
    } catch {
      setState("error");
    }
  };
  return (
    <form className="panel stack report-form" onSubmit={submit}>
      <strong>O que se passa?</strong>
      <Field label="Motivo">
        <select required value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Escolhe um motivo</option>
          {REPORT_REASONS.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Detalhes (opcional)">
        <textarea
          rows="3"
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Conta o que aconteceu. Só a administração lê isto."
        />
      </Field>
      {state === "error" && (
        <p className="error-box" role="alert">
          Não foi possível enviar. Se já denunciaste isto, a denúncia continua
          em análise.
        </p>
      )}
      <div className="actions">
        <button className="btn gold" disabled={state === "sending" || !reason}>
          {state === "sending" ? "A enviar…" : "Enviar denúncia"}
        </button>
        <button type="button" className="btn secondary" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
