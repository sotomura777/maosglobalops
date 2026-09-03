import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { watchAuth, getProfile } from './services/authService';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';

const AuthCtx = createContext({ user: null, profile: null, loading: true });
export const useAuth = () => useContext(AuthCtx);

export default function App() {
  const [state, setState] = useState({ user: null, profile: null, loading: true });

  useEffect(() => watchAuth(async (user) => {
    if (!user) return setState({ user: null, profile: null, loading: false });
    const profile = await getProfile(user.uid).catch(() => null);
    setState({ user, profile, loading: false });
  }), []);

  return (
    <AuthCtx.Provider value={state}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/entrar" element={<LoginPage />} />
          <Route path="/registar" element={<RegisterPage />} />
          <Route path="/app" element={state.loading ? null : state.user ? <HomePage /> : <Navigate to="/entrar" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthCtx.Provider>
  );
}
