import { createContext, useContext, useEffect, useState } from "react";
import {
  watchApplications,
  watchRead,
  watchSaved,
  watchApprovalRequests,
  watchHandovers,
  getCompanyStatus,
  watchFavorites,
  watchInvitations,
} from "./service";
import { timestampMillis } from "./model";
import { useAuth } from "../App";
const Context = createContext(null);
export const useMarket = () => useContext(Context);
export function MarketProvider({ children }) {
  const { user, profile } = useAuth();
  const [applications, setApplications] = useState([]);
  const [saved, setSaved] = useState([]);
  const [read, setRead] = useState({});
  const [approvals, setApprovals] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [ownApp, setOwnApp] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    setApplications([]);
    setSaved([]);
    setRead({});
    setApprovals([]);
    setHandovers([]);
    setOwnApp(null);
    setFavorites([]);
    setInvitations([]);
    setError("");
    const fail = () => {
      setError(
        "Não foi possível carregar os teus trabalhos. Tenta atualizar a página.",
      );
      setLoading(false);
    };
    const stops = [
      watchApplications(
        user.uid,
        profile.kind === "company",
        (data) => {
          setApplications(data);
          setLoading(false);
        },
        fail,
      ),
      watchSaved(user.uid, setSaved, fail),
      watchRead(user.uid, setRead, fail),
      ...(profile.kind === "company"
        ? [watchApprovalRequests(user.uid, setApprovals, () => {})]
        : []),
      watchHandovers(user.uid, profile.kind === "company", setHandovers, () => {}),
      profile.kind === "company"
        ? watchFavorites(user.uid, setFavorites, () => {})
        : watchInvitations(user.uid, setInvitations, () => {}),
    ];
    if (profile.kind === "company")
      getCompanyStatus(user.uid)
        .then((s) => setOwnApp(s.app))
        .catch(() => {});
    return () => stops.forEach((stop) => stop());
  }, [user.uid, profile.kind]);
  const unread = applications.filter((a) => {
    const incomingStatus =
      a.actorId !== user.uid &&
      timestampMillis(a.statusUpdatedAt || a.createdAt) > (read[a.id] || 0);
    const incomingMessage =
      a.lastMessageBy &&
      a.lastMessageBy !== user.uid &&
      timestampMillis(a.lastMessageAt) > (read[`chat-${a.id}`] || 0);
    return incomingStatus || incomingMessage;
  });
  const unreadMessages = applications.filter(
    (a) =>
      a.lastMessageBy &&
      a.lastMessageBy !== user.uid &&
      timestampMillis(a.lastMessageAt) > (read[`chat-${a.id}`] || 0),
  );
  return (
    <Context.Provider
      value={{
        applications,
        saved,
        unread,
        unreadMessages,
        approvals,
        handovers,
        ownApp,
        favorites,
        invitations,
        loading,
        error,
      }}
    >
      {children}
    </Context.Provider>
  );
}
