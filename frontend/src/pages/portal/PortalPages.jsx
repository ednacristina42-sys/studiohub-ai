import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Camera, Images, FileText, Receipt, CreditCard, Clock, MapPin, ArrowUpRight, Download,
  CheckCircle2, Save, Loader2, CalendarDays, ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { portalApi, usePortalAuth } from "@/lib/portalAuth";
import { useSettings } from "@/lib/settings";
import { eur, fmtDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const statusColor = {
  agendada: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  confirmada: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  realizada: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  entregue: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  paga: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  pendente: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  assinado: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

const Empty = ({ icon: Icon, text }) => (
  <Card className="p-14 border-dashed flex flex-col items-center text-center"><Icon className="h-9 w-9 text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">{text}</p></Card>
);

export function PortalDashboard() {
  const [d, setD] = useState(null);
  const navigate = useNavigate();
  useEffect(() => { portalApi.get("/portal/dashboard").then((r) => setD(r.data)).catch(() => {}); }, []);
  if (!d) return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>;

  const kpis = [
    { label: "Sessões", value: d.counts.sessions, icon: Camera },
    { label: "Galerias", value: d.counts.galleries, icon: Images },
    { label: "Por pagar", value: eur(d.pending_payments), icon: CreditCard },
    { label: "Pago", value: eur(d.paid_total), icon: CheckCircle2 },
  ];
  const actions = [
    { label: "As minhas galerias", icon: Images, to: "/portal/galerias" },
    { label: "As minhas sessões", icon: Camera, to: "/portal/sessoes" },
    { label: "Faturas", icon: Receipt, to: "/portal/faturas" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Área do Cliente</p>
        <h2 className="font-display text-3xl md:text-4xl font-light tracking-tight mt-1">Olá, {d.client.name?.split(" ")[0]}.</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => <Button key={a.label} variant="outline" data-testid={`pquick-${a.to.split("/").pop()}`} onClick={() => navigate(a.to)} className="rounded-full gap-2 hover:-translate-y-0.5 transition-transform"><a.icon className="h-4 w-4 text-primary" /> {a.label}</Button>)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-5 border-border"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">{c.label}</p><p className="font-display text-2xl font-medium mt-2">{c.value}</p></div><div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-primary"><c.icon className="h-4.5 w-4.5" /></div></div></Card>
          </motion.div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-border">
          <h3 className="font-display text-lg font-medium mb-4 flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Próxima sessão</h3>
          {d.next_session ? (
            <div><p className="font-medium">{d.next_session.title}</p><p className="text-sm text-muted-foreground capitalize mt-1">{d.next_session.type}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground"><span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{fmtDate(d.next_session.date)}</span>{d.next_session.time && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{d.next_session.time}</span>}{d.next_session.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{d.next_session.location}</span>}</div>
            </div>
          ) : <p className="text-sm text-muted-foreground py-4">Sem sessões agendadas.</p>}
        </Card>
        <Card className="p-6 border-border">
          <div className="flex items-center justify-between mb-4"><h3 className="font-display text-lg font-medium flex items-center gap-2"><Images className="h-4 w-4 text-primary" /> Últimas galerias</h3><button onClick={() => navigate("/portal/galerias")} className="text-sm text-primary flex items-center gap-1 hover:gap-2 transition-all">Ver <ArrowUpRight className="h-3.5 w-3.5" /></button></div>
          {d.galleries.length ? <div className="space-y-2">{d.galleries.map((g) => <div key={g.id} className="flex items-center justify-between py-2 border-b border-border last:border-0"><span className="text-sm font-medium">{g.title}</span><Badge variant="secondary" className="rounded-full text-xs">{g.photos?.length || 0} fotos</Badge></div>)}</div> : <p className="text-sm text-muted-foreground py-4">Ainda sem galerias.</p>}
        </Card>
      </div>
      <Card className="p-6 border-border">
        <h3 className="font-display text-lg font-medium mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Últimos documentos</h3>
        {d.documents.length ? <div className="space-y-2">{d.documents.map((c) => <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0"><div><p className="text-sm font-medium">{c.title}</p><p className="text-xs text-muted-foreground font-mono">{c.number}</p></div><Badge className={`rounded-full border capitalize ${statusColor[c.status] || ""}`}>{c.status}</Badge></div>)}</div> : <p className="text-sm text-muted-foreground py-4">Sem documentos.</p>}
      </Card>
    </div>
  );
}

function useList(url) {
  const [items, setItems] = useState(null);
  useEffect(() => { portalApi.get(url).then((r) => setItems(r.data)).catch(() => setItems([])); }, [url]);
  return items;
}

export function PortalSessions() {
  const items = useList("/portal/sessions");
  if (!items) return <Skeleton className="h-40 rounded-xl" />;
  if (!items.length) return <Empty icon={Camera} text="Ainda não tem sessões." />;
  return (
    <div className="space-y-3">
      {items.map((s, i) => (
        <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
          <Card data-testid={`psession-${s.id}`} className="p-4 border-border flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-accent flex items-center justify-center text-primary shrink-0"><Camera className="h-5 w-5" /></div>
            <div className="flex-1"><p className="font-medium">{s.title}</p><p className="text-xs text-muted-foreground capitalize">{s.type}</p></div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{fmtDate(s.date)}</span>{s.time && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{s.time}</span>}{s.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{s.location}</span>}</div>
            <Badge className={`rounded-full border capitalize ${statusColor[s.status] || ""}`}>{s.status}</Badge>
            <Button size="sm" variant="outline" data-testid={`psession-view-${s.id}`} onClick={() => toast.info("Detalhes da sessão em breve")} className="rounded-lg">Ver detalhes</Button>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

export function PortalGalleries() {
  const items = useList("/portal/galleries");
  if (!items) return <Skeleton className="h-40 rounded-xl" />;
  if (!items.length) return <Empty icon={Images} text="Ainda não tem galerias." />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((g, i) => (
        <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card data-testid={`pgallery-${g.id}`} className="overflow-hidden border-border group p-0">
            <div className="h-44 overflow-hidden bg-secondary">{g.cover ? <img src={g.cover} alt={g.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="h-full flex items-center justify-center text-muted-foreground"><Images className="h-10 w-10" /></div>}</div>
            <div className="p-4">
              <p className="font-display text-lg font-medium leading-tight">{g.title}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground"><span>{g.photos?.length || 0} fotos</span><span>·</span><span>{fmtDate(g.created_at)}</span></div>
              <div className="flex items-center justify-between mt-4">
                <Badge className={`rounded-full border capitalize ${statusColor[g.status] || "bg-secondary"}`}>{g.status}</Badge>
                <Button size="sm" data-testid={`pgallery-open-${g.id}`} disabled={!g.access_token} onClick={() => g.access_token && window.open(`/g/${g.access_token}`, "_blank")} className="rounded-lg gap-1">Abrir <ArrowUpRight className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

export function PortalContracts() {
  const items = useList("/portal/contracts");
  if (!items) return <Skeleton className="h-40 rounded-xl" />;
  if (!items.length) return <Empty icon={FileText} text="Sem contratos." />;
  return <div className="space-y-3">{items.map((c) => <Card key={c.id} data-testid={`pcontract-${c.id}`} className="p-4 border-border flex items-center justify-between"><div><p className="font-medium">{c.title}</p><p className="text-xs text-muted-foreground font-mono">{c.number}</p></div><Badge className={`rounded-full border capitalize ${statusColor[c.status] || ""}`}>{c.status}</Badge></Card>)}</div>;
}

export function PortalQuotes() {
  const items = useList("/portal/quotes");
  if (!items) return <Skeleton className="h-40 rounded-xl" />;
  if (!items.length) return <Empty icon={FileText} text="Sem orçamentos." />;
  return <div className="space-y-3">{items.map((q) => <Card key={q.id} data-testid={`pquote-${q.id}`} className="p-4 border-border flex items-center justify-between"><div><p className="font-medium">{q.title}</p><p className="text-xs text-muted-foreground font-mono">{q.number}</p></div><div className="flex items-center gap-3"><span className="font-display font-medium">{eur(q.total)}</span><Badge variant="secondary" className="rounded-full capitalize">{q.status}</Badge></div></Card>)}</div>;
}

export function PortalInvoices() {
  const items = useList("/portal/invoices");
  if (!items) return <Skeleton className="h-40 rounded-xl" />;
  if (!items.length) return <Empty icon={Receipt} text="Sem faturas." />;
  return <div className="space-y-3">{items.map((v) => <Card key={v.id} data-testid={`pinvoice-${v.id}`} className="p-4 border-border flex items-center justify-between"><div><p className="font-mono text-sm">{v.number}</p><p className="text-xs text-muted-foreground">{fmtDate(v.issue_date)}</p></div><div className="flex items-center gap-3"><span className="font-display font-medium">{eur(v.total)}</span><Badge className={`rounded-full border capitalize ${statusColor[v.status] || ""}`}>{v.status}</Badge></div></Card>)}</div>;
}

export function PortalDownloads() {
  return <Empty icon={Download} text="Os seus downloads aparecerão aqui após a entrega das galerias. (Estrutura pronta — descarregamento real numa fase futura.)" />;
}

export function PortalProfile() {
  const { client } = usePortalAuth();
  const { settings } = useSettings();
  const al = settings.address_labels || {};
  const [form, setForm] = useState({ ...client });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async () => {
    setSaving(true);
    try { await portalApi.put("/portal/profile", { name: form.name, email: form.email, phone: form.phone, tax_id: form.tax_id, address: form.address, postal_code: form.postal_code, city: form.city, region: form.region }); toast.success("Perfil atualizado"); }
    catch { toast.error("Erro ao guardar"); }
    finally { setSaving(false); }
  };
  return (
    <Card className="p-6 border-border max-w-2xl">
      <h3 className="font-display text-lg font-medium mb-5">O meu perfil</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2"><Label>Nome</Label><Input data-testid="pprofile-name" value={form.name || ""} onChange={set("name")} className="h-11 mt-1.5" /></div>
        <div><Label>Email</Label><Input data-testid="pprofile-email" value={form.email || ""} onChange={set("email")} className="h-11 mt-1.5" /></div>
        <div><Label>Telefone</Label><Input data-testid="pprofile-phone" value={form.phone || ""} onChange={set("phone")} className="h-11 mt-1.5" /></div>
        <div><Label>{settings.tax_name || "Documento Fiscal"}</Label><Input data-testid="pprofile-taxid" value={form.tax_id || form.nif || ""} onChange={set("tax_id")} className="h-11 mt-1.5" /></div>
        <div><Label>{al.postal_code || "Código Postal"}</Label><Input value={form.postal_code || ""} onChange={set("postal_code")} className="h-11 mt-1.5" /></div>
        <div className="md:col-span-2"><Label>Morada</Label><Input data-testid="pprofile-address" value={form.address || ""} onChange={set("address")} className="h-11 mt-1.5" /></div>
        <div><Label>{al.city || "Concelho"}</Label><Input value={form.city || ""} onChange={set("city")} className="h-11 mt-1.5" /></div>
        <div><Label>{al.region || "Distrito"}</Label><Input value={form.region || ""} onChange={set("region")} className="h-11 mt-1.5" /></div>
      </div>
      <Button data-testid="pprofile-save" onClick={save} disabled={saving} className="rounded-lg gap-2 mt-6">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar</Button>
    </Card>
  );
}
