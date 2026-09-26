import { useState, useEffect, createContext, useContext, lazy, Suspense } from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./services/firebase";
import { watchAuth, signOut } from "./services/authService";
import LandingPage from "./pages/LandingPage";
import AccountPage from "./pages/AccountPage";
import LegalPage from "./pages/LegalPage";
import GlobalOpsLogo from "./brand/Logo";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RegisterCompanyPage from "./pages/RegisterCompanyPage";
import Layout from "./marketplace/Layout";
import { MarketProvider } from "./marketplace/context";
// As páginas da app só descarregam quando são abertas: o primeiro ecrã fica mais leve.
const page = (load, name = "default") =>
  lazy(() => load().then((m) => ({ default: m[name] })));
const ChannelsPage = page(() => import("./pages/ChannelsPage"));
const EarningsPage = page(() => import("./pages/EarningsPage"));
const RankingsPage = page(() => import("./pages/RankingsPage"));
const Home = page(() => import("./marketplace/Home"));
const Explore = page(() => import("./marketplace/Jobs"), "Explore");
const JobDetails = page(() => import("./marketplace/Jobs"), "JobDetails");
const NewJob = page(() => import("./marketplace/Jobs"), "NewJob");
const MyWork = page(() => import("./marketplace/Work"), "MyWork");
const Engagement = page(() => import("./marketplace/Work"), "Engagement");
const Inbox = page(() => import("./marketplace/Work"), "Inbox");
const Directory = page(() => import("./marketplace/Profiles"), "Directory");
const PublicProfile = page(() => import("./marketplace/Profiles"), "PublicProfile");
const EditProfile = page(() => import("./marketplace/Profiles"), "EditProfile");
const Approvals = page(() => import("./marketplace/Profiles"), "Approvals");
const StaffHandover = page(() => import("./marketplace/Profiles"), "StaffHandover");
const AdminPage = page(() => import("./marketplace/Admin"), "AdminPage");
const PublicJobPage = page(() => import("./pages/PublicJobPage"));
import "./marketplace/market.css";
const AuthCtx = createContext({ user: null, profile: null, loading: true });
export const useAuth = () => useContext(AuthCtx);
function Protected() {
  const { user, profile, loading, error } = useAuth();
  if (loading)
    return (
      <div className="empty loading-screen" role="status">
        <GlobalOpsLogo variant="symbol" height={72} title="" aria-hidden="true" />
        A abrir a tua área…
      </div>
    );
  if (!user) return <Navigate to="/entrar" replace />;
  if (!profile)
    return (
      <div className="empty">
        <h3>
          {error
            ? "Não foi possível abrir o perfil"
            : "A preparar o teu perfil"}
        </h3>
        <p>
          {error ||
            "Se acabaste de criar a conta, o perfil aparece dentro de instantes."}
        </p>
        <button
          className="btn secondary"
          style={{ marginTop: 16 }}
          onClick={() => signOut()}
        >
          Voltar a entrar
        </button>
      </div>
    );
  return (
    <MarketProvider>
      <Outlet />
    </MarketProvider>
  );
}
export default function App() {
  const [state, setState] = useState({
    user: null,
    profile: null,
    loading: true,
    error: "",
  });
  useEffect(() => {
    let stopProfile = () => {};
    let activeUid = null;
    const stopAuth = watchAuth((user) => {
      // Token refresh must not unmount a form or discard its pending response.
      if (user && user.uid === activeUid) {
        setState((previous) => ({ ...previous, user }));
        return;
      }
      activeUid = user?.uid || null;
      stopProfile();
      if (!user) {
        setState({ user: null, profile: null, loading: false, error: "" });
        return;
      }
      setState({ user, profile: null, loading: true, error: "" });
      stopProfile = onSnapshot(
        doc(db, "profiles", user.uid),
        { includeMetadataChanges: true },
        (snap) =>
          setState((previous) => ({
            user,
            profile: snap.exists() ? { ...snap.data(), id: snap.id } : null,
            loading:
              snap.metadata.hasPendingWrites &&
              (!previous.profile || previous.loading),
            error: "",
          })),
        () =>
          setState({
            user,
            profile: null,
            loading: false,
            error: "Verifica a ligação e volta a entrar.",
          }),
      );
    });
    return () => {
      stopAuth();
      stopProfile();
    };
  }, []);
  return (
    <AuthCtx.Provider value={state}>
      <RouterProvider router={router} />
    </AuthCtx.Provider>
  );
}
const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<LandingPage />} />
      <Route path="/recuperar-password" element={<AccountPage recovery />} />
      <Route path="/privacidade" element={<LegalPage kind="privacy" />} />
      <Route path="/termos" element={<LegalPage kind="terms" />} />
      <Route
        path="/ofertas/:id"
        element={
          <Suspense fallback={null}>
            <PublicJobPage />
          </Suspense>
        }
      />
      <Route path="/entrar" element={<LoginPage />} />
      <Route path="/registar" element={<RegisterPage />} />
      <Route path="/registar-empresa" element={<RegisterCompanyPage />} />
      <Route element={<Protected />}>
        <Route path="/app" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="trabalhos" element={<Explore />} />
          <Route path="trabalhos/:id" element={<JobDetails />} />
          <Route path="publicar" element={<NewJob />} />
          <Route path="meus-trabalhos" element={<MyWork />} />
          <Route path="contratacoes/:id" element={<Engagement />} />
          <Route path="mensagens" element={<Inbox />} />
          <Route path="notificacoes" element={<Inbox notifications />} />
          <Route path="diretorio" element={<Directory />} />
          <Route path="profissionais/:id" element={<PublicProfile />} />
          <Route path="conta" element={<AccountPage />} />
          <Route path="perfil" element={<EditProfile />} />
          <Route path="aprovacoes" element={<Approvals />} />
          <Route path="equipa" element={<StaffHandover />} />
          <Route path="admin" element={<AdminPage />} />
          <Route
            path="canais"
            element={
              <div className="legacy-page">
                <ChannelsPage />
              </div>
            }
          />
          <Route
            path="ganhos"
            element={
              <div className="legacy-page">
                <EarningsPage />
              </div>
            }
          />
          <Route
            path="ranking"
            element={
              <div className="legacy-page">
                <RankingsPage />
              </div>
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </>,
  ),
);
