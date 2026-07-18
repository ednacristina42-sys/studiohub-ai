let current = {
  company_name: "StudioHub AI",
  country: "PT",
  language: "pt",
  currency: "EUR",
  locale: "pt-PT",
  timezone: "Europe/Lisbon",
  date_format: "dd/MM/yyyy",
  tax_rate: 23,
  tax_name: "NIF",
  tax_label: "IVA",
  address_labels: { postal_code: "Código Postal", region: "Distrito", city: "Concelho", district: "Freguesia" },
};

export const setLocaleSettings = (s) => { current = { ...current, ...(s || {}) }; };
export const getLocaleSettings = () => current;

export const money = (n) => {
  try {
    return new Intl.NumberFormat(current.locale, { style: "currency", currency: current.currency }).format(n || 0);
  } catch {
    return `${(n || 0).toFixed(2)} ${current.currency}`;
  }
};

export const formatDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(current.locale, { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
};
