import { useState } from "react";
import { Link } from "react-router-dom";
import {
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
} from "firebase/auth";
import { auth } from "../services/firebase";
import { updateProfile } from "../services/profileService";
import { signOut } from "../services/authService";
import { exportMyData, deleteMyAccount } from "../marketplace/service";
import { useTheme, setPreference } from "../theme";
import { useAuth } from "../App";

export default function AccountPage({ recovery = false }) {
  const { user, profile } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sentAt, setSentAt] = useState(0);
  const run = async (action) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (e) {
      setError(
        e.code === "auth/too-many-requests"
          ? "Demasiadas tentativas. Aguarda alguns minutos antes de repetir."
          : "Não foi possível concluir. Verifica a ligação e tenta novamente.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="panel"
      style={{ maxWidth: 520, margin: "32px auto", padding: 24 }}
    >
      <h1>{recovery ? "Recuperar palavra-passe" : "Segurança da conta"}</h1>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {recovery ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              try {
                await sendPasswordResetEmail(auth, email.trim(), {
                  url: window.location.origin + "/entrar",
                });
              } catch (e) {
                if (e.code !== "auth/user-not-found") throw e;
              }
              setMessage(
                "Se existir uma conta com este email, receberás uma ligação para escolher uma nova palavra-passe. Verifica também o spam.",
              );
            });
          }}
        >
          <p>Indica o email da tua conta.</p>
          <label className="field">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button className="btn gold" disabled={busy}>
            {busy ? "A enviar…" : "Enviar ligação"}
          </button>
          <p>
            <Link to="/entrar">Voltar a entrar</Link>
          </p>
        </form>
      ) : (
        <>
          <p>{user?.email}</p>
          {user?.emailVerified ? (
            <p>Email confirmado.</p>
          ) : (
            <>
              <p>
                Confirma o teu email para publicar ofertas, enviar candidaturas
                e associar experiência importada.
              </p>
              <div className="actions">
                <button
                  className="btn gold"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      if (Date.now() - sentAt < 60000) {
                        setMessage(
                          "Aguarda um minuto antes de pedir outra ligação.",
                        );
                        return;
                      }
                      await sendEmailVerification(auth.currentUser, {
                        url: window.location.origin + "/app/conta",
                      });
                      setSentAt(Date.now());
                      setMessage(
                        "Enviámos uma ligação de confirmação. Verifica o email e o spam; depois volta aqui.",
                      );
                    })
                  }
                >
                  Enviar confirmação
                </button>
                <button
                  className="btn secondary"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await reload(auth.currentUser);
                      const verified = auth.currentUser.emailVerified;
                      if (verified) await auth.currentUser.getIdToken(true);
                      else
                        setMessage(
                          "O email ainda não está confirmado. Abre a ligação recebida e tenta novamente.",
                        );
                    })
                  }
                >
                  Já confirmei o email
                </button>
              </div>
            </>
          )}
          {profile && (
            <label className="row" style={{ gap: 10, margin: "18px 0" }}>
              <input
                type="checkbox"
                disabled={busy}
                checked={profile.emailNotifications !== false}
                onChange={(e) => {
                  const on = e.target.checked;
                  run(async () => {
                    await updateProfile(user.uid, { emailNotifications: on });
                    setMessage(
                      on
                        ? "Vais receber avisos por email."
                        : "Deixas de receber avisos por email. Continuam a aparecer na app.",
                    );
                  });
                }}
              />
              Receber avisos por email (candidaturas, confirmações e lembretes)
            </label>
          )}
          <p>
            <Link to="/recuperar-password">
              Alterar a palavra-passe por email
            </Link>
          </p>
          <Appearance />
          {profile && <YourData />}
          <p>
            <Link to="/app/perfil">Voltar ao perfil</Link>
          </p>
        </>
      )}
    </section>
  );
}

// Direitos RGPD: descarregar os dados e apagar a conta.
function YourData() {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const download = async () => {
    setBusy("export");
    setError("");
    try {
      const data = await exportMyData();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `globalops-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };
  const remove = async () => {
    setBusy("delete");
    setError("");
    try {
      await deleteMyAccount(reason);
      await signOut().catch(() => {});
      window.location.assign("/");
    } catch (e) {
      setError(e.message);
      setBusy("");
    }
  };
  return (
    <section style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
      <h2 className="section-title">Os teus dados</h2>
      <p className="subtle">
        Descarrega tudo o que a GlobalOps guarda sobre ti num ficheiro. Ver a{" "}
        <Link to="/privacidade">política de privacidade</Link>.
      </p>
      <div className="actions" style={{ margin: "12px 0 20px" }}>
        <button className="btn secondary" disabled={!!busy} onClick={download}>
          {busy === "export" ? "A preparar…" : "Descarregar os meus dados"}
        </button>
      </div>
      {error && <p role="alert" className="error-box">{error}</p>}
      {!confirming ? (
        <button className="quiet" disabled={!!busy} onClick={() => setConfirming(true)}>
          Apagar a minha conta
        </button>
      ) : (
        <div className="panel stack">
          <strong>Apagar a conta é definitivo</strong>
          <p className="subtle">
            Apagamos o perfil, os contactos, o currículo e a reputação. Nas
            contratações que a outra parte também tem, o teu nome passa a
            "Conta apagada". Se tiveres trabalhos em curso, cancela-os primeiro.
          </p>
          <label className="field">
            Porque vais sair? (opcional)
            <textarea rows="2" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <label className="field">
            Escreve APAGAR para confirmar
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
          <div className="actions">
            <button
              className="btn"
              style={{ background: "var(--danger)", color: "#fff", borderColor: "var(--danger)" }}
              disabled={!!busy || typed.trim() !== "APAGAR"}
              onClick={remove}
            >
              {busy === "delete" ? "A apagar…" : "Apagar definitivamente"}
            </button>
            <button className="btn secondary" disabled={!!busy} onClick={() => setConfirming(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Appearance() {
  const { pref } = useTheme();
  return (
    <fieldset className="audience" style={{ marginTop: 20 }}>
      <legend>Aparência</legend>
      {[
        ["auto", "Automático", "Segue o modo do telemóvel ou do computador."],
        ["dark", "Escuro", "Preto e dourado."],
        ["light", "Claro", "Branco, bordeaux e dourado."],
      ].map(([value, label, hint]) => (
        <label className="choice" key={value}>
          <input
            type="radio"
            name="appearance"
            checked={pref === value}
            onChange={() => setPreference(value)}
          />
          <span>
            <strong>{label}</strong>
            <small>{hint}</small>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
