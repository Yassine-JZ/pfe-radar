import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("token")));

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    api("/auth/me", { token })
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("token");
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const saveSession = (data) => {
    localStorage.setItem("token", data.access_token);
    setUser(data.user);
    setToken(data.access_token);
  };

  const login = async (email, password) =>
    saveSession(await api("/auth/login", { method: "POST", body: { email, password } }));

  const register = async (full_name, email, password) =>
    saveSession(
      await api("/auth/register", { method: "POST", body: { full_name, email, password } })
    );

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}