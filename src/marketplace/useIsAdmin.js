import { useEffect, useState } from "react";
import { useAuth } from "../App";

// A claim vem no token de login; a app só a lê, nunca a escreve.
export function useIsAdmin() {
  const { user } = useAuth();
  const [admin, setAdmin] = useState(null);
  useEffect(() => {
    let active = true;
    user
      ?.getIdTokenResult()
      .then((r) => active && setAdmin(r.claims.admin === true))
      .catch(() => active && setAdmin(false));
    return () => {
      active = false;
    };
  }, [user]);
  return admin;
}
