export const COUNTRIES = {
  PT: {
    name: "Portugal", currency: "EUR", locale: "pt-PT", language: "pt", timezone: "Europe/Lisbon",
    date_format: "dd/MM/yyyy", tax_rate: 23, tax_name: "NIF", tax_label: "IVA",
    address_labels: { postal_code: "Código Postal", region: "Distrito", city: "Concelho", district: "Freguesia" },
  },
  BR: {
    name: "Brasil", currency: "BRL", locale: "pt-BR", language: "pt", timezone: "America/Sao_Paulo",
    date_format: "dd/MM/yyyy", tax_rate: 0, tax_name: "CPF/CNPJ", tax_label: "Imposto",
    address_labels: { postal_code: "CEP", region: "Estado", city: "Cidade", district: "Bairro" },
  },
  ES: {
    name: "España", currency: "EUR", locale: "es-ES", language: "es", timezone: "Europe/Madrid",
    date_format: "dd/MM/yyyy", tax_rate: 21, tax_name: "NIF/CIF", tax_label: "IVA",
    address_labels: { postal_code: "Código Postal", region: "Provincia", city: "Ciudad", district: "Barrio" },
  },
  US: {
    name: "United States", currency: "USD", locale: "en-US", language: "en", timezone: "America/New_York",
    date_format: "MM/dd/yyyy", tax_rate: 0, tax_name: "EIN / Tax ID", tax_label: "Sales Tax",
    address_labels: { postal_code: "ZIP Code", region: "State", city: "City", district: "District" },
  },
  GB: {
    name: "United Kingdom", currency: "GBP", locale: "en-GB", language: "en", timezone: "Europe/London",
    date_format: "dd/MM/yyyy", tax_rate: 20, tax_name: "VAT Number", tax_label: "VAT",
    address_labels: { postal_code: "Postcode", region: "County", city: "City", district: "District" },
  },
  FR: {
    name: "France", currency: "EUR", locale: "fr-FR", language: "fr", timezone: "Europe/Paris",
    date_format: "dd/MM/yyyy", tax_rate: 20, tax_name: "Numéro TVA", tax_label: "TVA",
    address_labels: { postal_code: "Code Postal", region: "Région", city: "Ville", district: "Quartier" },
  },
  OTHER: {
    name: "Outro / Other", currency: "USD", locale: "en-US", language: "en", timezone: "UTC",
    date_format: "yyyy-MM-dd", tax_rate: 0, tax_name: "Tax ID", tax_label: "Tax",
    address_labels: { postal_code: "Postal Code", region: "State / Province", city: "City", district: "District" },
  },
};

export const CURRENCIES = ["EUR", "BRL", "USD", "GBP", "CHF", "CAD", "AUD", "JPY", "MXN", "AOA", "MZN"];
export const LOCALES = ["pt-PT", "pt-BR", "en-US", "en-GB", "es-ES", "fr-FR", "de-DE", "it-IT"];
export const TIMEZONES = ["Europe/Lisbon", "America/Sao_Paulo", "America/New_York", "Europe/London", "Europe/Madrid", "Europe/Paris", "UTC"];
