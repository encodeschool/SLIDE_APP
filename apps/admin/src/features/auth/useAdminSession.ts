import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Translations } from "../../app/translations";
import { isAdmin, login, logout, refreshSession } from "./authApi";

export function useAdminSession(t: Translations) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    refreshSession().then((session) => {
      if (!active) return;
      if (isAdmin(session)) setAccessToken(session.accessToken);
      else if (session) setError(t.notAdmin);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>, email: string, password: string): Promise<boolean> {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await login(email, password, t.invalidLogin);
      if (!isAdmin(session)) {
        await logout();
        setError(t.notAdmin);
      } else {
        setAccessToken(session.accessToken);
      }
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.invalidLogin);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await logout();
    setAccessToken(null);
    setError("");
  }

  const clearSession = useCallback(() => setAccessToken(null), []);

  return {
    accessToken,
    loading,
    error,
    signIn,
    signOut,
    clearSession,
  };
}
