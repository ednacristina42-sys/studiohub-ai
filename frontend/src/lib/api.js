import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

export const eur = (n) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n || 0);

export const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
};

export default api;
