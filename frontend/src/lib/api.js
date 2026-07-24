import axios from "axios";
import { money, formatDate } from "@/lib/format";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("studio_token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export const eur = (n) => money(n);
export const fmtDate = (d) => formatDate(d);

export default api;
