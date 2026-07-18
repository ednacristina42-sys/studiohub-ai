import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, Save, Building2, Languages, Coins, Clock, CalendarDays, Percent, FileBadge } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSettings } from "@/lib/settings";
import { COUNTRIES, CURRENCIES, LOCALES, TIMEZONES } from "@/lib/countries";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { eur } from "@/lib/api";

export default function Definicoes() {
  const { settings, reload } = useSettings();
  const [form, setForm] = useState({ ...settings });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const applyCountry = (code) => {
    const c = COUNTRIES[code];
    if (!c) return set("country", code);
    setForm((f) => ({
      ...f, country: code, currency: c.currency, locale: c.locale, language: c.language,
      timezone: c.timezone, date_format: c.date_format, tax_rate: c.tax_rate,
      tax_name: c.tax_name, tax_label: c.tax_label, address_labels: c.address_labels,
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/settings", { ...form, tax_rate: Number(form.tax_rate) || 0 });
      await reload();
      toast.success("Definições guardadas — a aplicar em toda a plataforma");
      setTimeout(() => window.location.reload(), 800);
    } catch { toast.error("Erro ao guardar"); }
    finally { setSaving(false); }
  };

  const labels = form.address_labels || {};

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Internacional</p>
        <h2 className="font-display text-3xl font-light tracking-tight mt-1">Configuração da empresa</h2>
        <p className="text-sm text-muted-foreground mt-1">Adapta automaticamente moeda, imposto, documento fiscal, datas e idioma em toda a plataforma.</p>
      </div>

      <Card className="p-6 border-border space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Nome da empresa</Label><Input data-testid="set-company" value={form.company_name || ""} onChange={(e) => set("company_name", e.target.value)} className="h-11 mt-1.5" /></div>
          <div><Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> País</Label>
            <Select value={form.country} onValueChange={applyCountry}>
              <SelectTrigger data-testid="set-country" className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(COUNTRIES).map(([k, c]) => <SelectItem key={k} value={k}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="flex items-center gap-1.5"><Languages className="h-3.5 w-3.5" /> Idioma / Locale</Label>
            <Select value={form.locale} onValueChange={(v) => set("locale", v)}>
              <SelectTrigger data-testid="set-locale" className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{LOCALES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="flex items-center gap-1.5"><Coins className="h-3.5 w-3.5" /> Moeda</Label>
            <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
              <SelectTrigger data-testid="set-currency" className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Fuso horário</Label>
            <Select value={form.timezone} onValueChange={(v) => set("timezone", v)}>
              <SelectTrigger data-testid="set-timezone" className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Formato de data</Label>
            <Select value={form.date_format} onValueChange={(v) => set("date_format", v)}>
              <SelectTrigger data-testid="set-dateformat" className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="dd/MM/yyyy">dd/MM/yyyy</SelectItem><SelectItem value="MM/dd/yyyy">MM/dd/yyyy</SelectItem><SelectItem value="yyyy-MM-dd">yyyy-MM-dd</SelectItem></SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t border-border pt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div><Label className="flex items-center gap-1.5"><FileBadge className="h-3.5 w-3.5" /> Documento fiscal</Label><Input data-testid="set-taxname" value={form.tax_name || ""} onChange={(e) => set("tax_name", e.target.value)} className="h-11 mt-1.5" placeholder="NIF, CPF, VAT, EIN..." /></div>
          <div><Label>Nome do imposto</Label><Input data-testid="set-taxlabel" value={form.tax_label || ""} onChange={(e) => set("tax_label", e.target.value)} className="h-11 mt-1.5" placeholder="IVA, VAT, GST..." /></div>
          <div><Label className="flex items-center gap-1.5"><Percent className="h-3.5 w-3.5" /> Taxa (%)</Label><Input data-testid="set-taxrate" type="number" value={form.tax_rate} onChange={(e) => set("tax_rate", e.target.value)} className="h-11 mt-1.5" /></div>
        </div>

        <div className="border-t border-border pt-5">
          <p className="text-sm font-medium mb-2">Etiquetas de morada (auto por país)</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(labels).map(([k, v]) => <Badge key={k} variant="secondary" className="rounded-full">{v}</Badge>)}
          </div>
        </div>

        <div className="border-t border-border pt-5 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Pré-visualização: <span className="font-medium text-foreground">{eur(1234.5)}</span> · {form.tax_label} {form.tax_rate}% · {form.tax_name}</div>
          <Button data-testid="save-settings-page-btn" onClick={save} disabled={saving} className="rounded-lg gap-2 hover:-translate-y-0.5 transition-transform"><Save className="h-4 w-4" /> Guardar</Button>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground leading-relaxed">Arquitetura preparada para i18n/l10n: adicione novos países em <code className="font-mono">lib/countries.js</code> ou defina valores personalizados acima — sem alterar o resto do código. Moeda, imposto, documento fiscal e datas propagam-se a clientes, orçamentos, contratos, faturas, financeiro, loja e área do cliente.</p>
    </div>
  );
}
