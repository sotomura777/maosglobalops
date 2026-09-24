import { useState } from "react";
import { Link } from "react-router-dom";
import {
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
} from "firebase/auth";
import { auth } from "../services/firebase";
import { updateProfile } from "../services/profileService";
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
          <p>
            <Link to="/app/perfil">Voltar ao perfil</Link>
          </p>
        </>
      )}
    </section>
  );
}
