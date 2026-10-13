import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

// Logged out automatically after this much inactivity (protects a shared shop computer)
const IDLE_MS = 30 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  // On page load: is there a valid login cookie already?
  useEffect(() => {
    api
      .me()
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Any API call that comes back "401" sends the user to the login page
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      setNotice("Your session has expired. Please log in again.");
    };
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, []);

  const login = useCallback(async (username, password) => {
    const r = await api.login(username, password);
    setNotice("");
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* cookie is cleared server-side; ignore network errors */
    }
    setUser(null);
  }, []);

  // Inactivity timer
  useEffect(() => {
    if (!user) return undefined;
    let timer;
    const expire = () => {
      api.logout().catch(() => {});
      setNotice("You were logged out after 30 minutes of inactivity.");
      setUser(null);
    };
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(expire, IDLE_MS);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [user]);

  const clearNotice = useCallback(() => setNotice(""), []);

  return (
    <AuthContext.Provider value={{ user, loading, notice, clearNotice, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};