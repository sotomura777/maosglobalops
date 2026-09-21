import { useState, useEffect, createContext, useContext } from "react";
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
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RegisterCompanyPage from "./pages/RegisterCompanyPage";
import ChannelsPage from "./pages/ChannelsPage";
import EarningsPage from "./pages/EarningsPage";
import RankingsPage from "./pages/RankingsPage";
import Layout from "./marketplace/Layout";
import Home from "./marketplace/Home";
import { Explore, JobDetails, NewJob } from "./marketplace/Jobs";
import { MyWork, Engagement, Inbox } from "./marketplace/Work";
import { Directory, PublicProfile, EditProfile } from "./marketplace/Profiles";
import { MarketProvider } from "./marketplace/context";
import "./marketplace/market.css";
const AuthCtx = createContext({ user: null, profile: null, loading: true });
export const useAuth = () => useContext(AuthCtx);
function Protected() {
  const { user, profile, loading, error } = useAuth();
  if (loading)
    return (
      <div className="empty" role="status">
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
