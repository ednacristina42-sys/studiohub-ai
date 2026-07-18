import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const portalApi = axios.create({ baseURL: API });
portalApi.interceptors.request.use((config) => {
  const t = localStorage.getItem("portal_token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

const PortalAuthContext = createContext({ client: null, ready: false, login: async () => {}, logout: () => {} });

export const PortalAuthProvider = ({ children }) => {
  const [client, setClient] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("portal_token");
    if (!t) { setReady(true); return; }
    portalApi.get("/portal/auth/me").then((r) => setClient(r.data)).catch(() => localStorage.removeItem("portal_token")).finally(() => setReady(true));
  }, []);

  const login = async (email, password) => {
    const r = await portalApi.post("/portal/auth/login", { email, password });
    localStorage.setItem("portal_token", r.data.token);
    setClient(r.data.client);
    return r.data.client;
  };
  const logout = () => { localStorage.removeItem("portal_token"); setClient(null); };

  return <PortalAuthContext.Provider value={{ client, ready, login, logout }}>{children}</PortalAuthContext.Provider>;
};

export const usePortalAuth = () => useContext(PortalAuthContext);
