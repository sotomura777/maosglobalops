import { cloneElement, useId } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { useAuth } from "../App";
import { signOut } from "../services/authService";
import { useMarket } from "./context";
import { initials } from "../ui";
export function Icon({ name, ...props }) {
  const paths = {
    home: "M3 10 12 3l9 7v10H6V10m3 10v-7h6v7",
    search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    work: "M8 6V3h8v3M3 7h18v14H3zM3 12h18M10 12v3h4v-3",
    people:
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M17 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-4",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
    user: "M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    message: "M21 3H3v14h5v4l5-4h8z",
    arrow: "M5 12h14M13 6l6 6-6 6",
    bookmark: "M6 3h12v18l-6-4-6 4z",
    check: "M4 12l5 5L20 6",
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.work} />
    </svg>
  );
}
export default function Layout() {
  const { profile, user } = useAuth();
  const { unread, unreadMessages, approvals = [], error } = useMarket();
  const company = profile.kind === "company";
  const nav = [
    ["/app", "home", "Início"],
    [
      company ? "/app/diretorio" : "/app/trabalhos",
      company ? "people" : "search",
      company ? "Profissionais" : "Explorar",
    ],
    ["/app/meus-trabalhos", "work", "Trabalhos"],
    ["/app/mensagens", "message", "Mensagens"],
    ...(company ? [["/app/aprovacoes", "check", "Aprovações"]] : []),
    ["/app/perfil", "user", "Perfil"],
  ];
  return (
    <div className="market-shell">
      <header className="market-header">
        <Link className="wordmark" to="/app">
          global<span>ops</span>
          <small>mercado de trabalho</small>
        </Link>
        <div className="header-actions">
          <Link
            className="icon-button"
            to="/app/notificacoes"
            aria-label={`Notificações${unread.length ? `, ${unread.length} novas` : ""}`}
          >
            <Icon name="bell" />
            {unread.length > 0 && (
              <span className="notification-dot">{unread.length}</span>
            )}
          </Link>
          <Link className="avatar" to="/app/perfil" aria-label="O meu perfil">
            {initials(profile.name)}
          </Link>
          <button
            className="quiet"
            onClick={() =>
              signOut().catch(() => alert("Não foi possível sair."))
            }
          >
            Sair
          </button>
        </div>
      </header>
      <div className="market-frame">
        <aside className="market-sidebar">
          <div className="eyebrow">
            {company ? "Área da empresa" : "A tua área"}
          </div>
          <nav>
            {nav.map(([to, icon, label]) => (
              <NavLink end={to === "/app"} key={to} to={to}>
                <Icon name={icon} />
                {label}
                {icon === "message" && unreadMessages.length > 0 && (
                  <span className="nav-count">{unreadMessages.length}</span>
                )}
                {icon === "check" && approvals.length > 0 && (
                  <span className="nav-count">{approvals.length}</span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-extra">
            <Link to="/app/conta">Segurança da conta</Link>
            <Link to="/app/ganhos">Horas e ganhos</Link>
            <Link to="/app/canais">Comunidade</Link>
            <Link to="/app/ranking">Ranking</Link>
          </div>
          <div className="sidebar-note">
            O próximo trabalho
            <br />
            começa aqui.<span>Independente. Com ligação.</span>
          </div>
        </aside>
        <main className="market-main">
          {!user.emailVerified && (
            <div className="panel" style={{ marginBottom: 20 }}>
              <strong>Confirma o teu email</strong>
              <p>
                Podes explorar e preparar o perfil. Para publicar ou
                candidatar-te, confirma o email.
              </p>
              <Link className="btn secondary" to="/app/conta">
                Confirmar email
              </Link>
            </div>
          )}
          {error && <ErrorBox>{error}</ErrorBox>}
          <Outlet />
        </main>
      </div>
      <nav className="market-tabs" aria-label="Navegação principal">
        {nav.map(([to, icon, label]) => (
          <NavLink end={to === "/app"} key={to} to={to}>
            <Icon name={icon} />
            <span>
              {label}
              {icon === "message" && unreadMessages.length > 0 && (
                <b className="nav-count">{unreadMessages.length}</b>
              )}
              {icon === "check" && approvals.length > 0 && (
                <b className="nav-count">{approvals.length}</b>
              )}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
export const ErrorBox = ({ children }) =>
  children ? (
    <div className="error-box" role="alert">
      {children}
    </div>
  ) : null;
export const Empty = ({ title, children }) => (
  <div className="empty">
    <Icon name="work" width="30" height="30" />
    <h3>{title}</h3>
    <p>{children}</p>
  </div>
);
export const Heading = ({ eyebrow, title, children, action }) => (
  <div className="page-heading">
    <div>
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
    {action}
  </div>
);
export function Field({ label, children }) {
  const generatedId = useId();
  const id = children.props.id || generatedId;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
