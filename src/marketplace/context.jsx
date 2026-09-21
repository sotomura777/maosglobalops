import { createContext, useContext, useEffect, useState } from "react";
import { watchApplications, watchRead, watchSaved } from "./service";
import { timestampMillis } from "./model";
import { useAuth } from "../App";
const Context = createContext(null);
export const useMarket = () => useContext(Context);
export function MarketProvider({ children }) {
  const { user, profile } = useAuth();
  const [applications, setApplications] = useState([]);
  const [saved, setSaved] = useState([]);
  const [read, setRead] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    setApplications([]);
    setSaved([]);
    setRead({});
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
    ];
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
      value={{ applications, saved, unread, unreadMessages, loading, error }}
    >
      {children}
    </Context.Provider>
  );
}
