import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Mail, Phone, MapPin, Hash, Cake, Star, Camera, Images, FileText,
  FileSpreadsheet, CreditCard, MessageSquare, History, MessageCircle,
} from "lucide-react";
import { api, eur, fmtDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const sessionStatus = {
  agendada: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  confirmada: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  realizada: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  entregue: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  cancelada: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [galleries, setGalleries] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    api.get(`/clients/${id}`).then((r) => setClient(r.data)).catch(() => {});
    api.get("/sessions").then((r) => setSessions(r.data));
    api.get("/galleries").then((r) => setGalleries(r.data));
    api.get("/invoices").then((r) => setInvoices(r.data));
  }, [id]);

  if (!client) return <div className="space-y-4"><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>;

  const mySessions = sessions.filter((s) => s.client_name === client.name);
  const myGalleries = galleries.filter((g) => g.client_name === client.name);
  const myInvoices = invoices.filter((i) => i.client_name === client.name);
  const history = [
    ...mySessions.map((s) => ({ date: s.date, text: `Sessão: ${s.title}`, icon: Camera })),
    ...myInvoices.map((i) => ({ date: i.issue_date, text: `Fatura ${i.number} — ${eur(i.total)} (${i.status})`, icon: CreditCard })),
  ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const info = [
    client.email && { icon: Mail, val: client.email },
    client.phone && { icon: Phone, val: client.phone },
    client.whatsapp && { icon: MessageCircle, val: client.whatsapp },
    client.address && { icon: MapPin, val: client.address },
    client.nif && { icon: Hash, val: `NIF ${client.nif}` },
    client.birthdate && { icon: Cake, val: fmtDate(client.birthdate) },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <Link to="/clientes" data-testid="back-clients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Clientes
      </Link>

      <Card className="p-6 border-border">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <Avatar className="h-20 w-20"><AvatarImage src={client.photo} /><AvatarFallback className="bg-accent text-accent-foreground font-display text-2xl font-semibold">{client.name.charAt(0)}</AvatarFallback></Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl md:text-3xl font-light tracking-tight">{client.name}</h2>
              {client.favorite && <Star className="h-5 w-5 text-primary fill-primary" />}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <Badge className="rounded-full border capitalize bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{client.status}</Badge>
              <Badge variant="secondary" className="rounded-full capitalize">{client.client_type}</Badge>
              {client.origin && <Badge variant="secondary" className="rounded-full capitalize">via {client.origin}</Badge>}
              {client.tags?.map((t) => <Badge key={t} variant="outline" className="rounded-full capitalize">{t}</Badge>)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:min-w-[280px]">
            <Metric label="Sessões" value={mySessions.length} />
            <Metric label="Faturado" value={eur(myInvoices.reduce((s, i) => s + i.total, 0))} />
          </div>
        </div>
        {info.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6 pt-6 border-t border-border">
            {info.map((it, i) => (<p key={i} className="flex items-center gap-2 text-sm text-muted-foreground"><it.icon className="h-4 w-4 text-primary shrink-0" />{it.val}</p>))}
          </div>
        )}
        {client.notes && <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{client.notes}</p>}
      </Card>

      <Tabs defaultValue="sessoes">
        <TabsList className="flex-wrap h-auto justify-start">
          <TabsTrigger value="sessoes" data-testid="tab-sessions"><Camera className="h-3.5 w-3.5 mr-1.5" />Sessões</TabsTrigger>
          <TabsTrigger value="galerias" data-testid="tab-galleries"><Images className="h-3.5 w-3.5 mr-1.5" />Galerias</TabsTrigger>
          <TabsTrigger value="contratos" data-testid="tab-contracts"><FileText className="h-3.5 w-3.5 mr-1.5" />Contratos</TabsTrigger>
          <TabsTrigger value="orcamentos" data-testid="tab-quotes"><FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />Orçamentos</TabsTrigger>
          <TabsTrigger value="pagamentos" data-testid="tab-payments"><CreditCard className="h-3.5 w-3.5 mr-1.5" />Pagamentos</TabsTrigger>
          <TabsTrigger value="mensagens" data-testid="tab-messages"><MessageSquare className="h-3.5 w-3.5 mr-1.5" />Mensagens</TabsTrigger>
          <TabsTrigger value="historico" data-testid="tab-history"><History className="h-3.5 w-3.5 mr-1.5" />Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="sessoes" className="mt-5">
          {mySessions.length === 0 ? <EmptyTab text="Sem sessões para este cliente." /> : (
            <div className="space-y-3">{mySessions.map((s) => (
              <Card key={s.id} className="p-4 border-border flex items-center justify-between">
                <div><p className="font-medium">{s.title}</p><p className="text-xs text-muted-foreground capitalize">{s.type} · {fmtDate(s.date)} {s.time}</p></div>
                <div className="flex items-center gap-3"><span className="font-display font-medium">{eur(s.value)}</span><Badge className={`rounded-full border capitalize ${sessionStatus[s.status] || ""}`}>{s.status}</Badge></div>
              </Card>))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="galerias" className="mt-5">
          {myGalleries.length === 0 ? <EmptyTab text="Sem galerias para este cliente." /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{myGalleries.map((g) => (
              <Link key={g.id} to={`/galerias/${g.id}`}>
                <Card className="overflow-hidden border-border group hover:border-primary/40 transition-colors p-0">
                  <div className="h-32 overflow-hidden"><img src={g.cover} alt={g.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>
                  <div className="p-3 flex items-center justify-between"><p className="text-sm font-medium truncate">{g.title}</p><Badge variant="secondary" className="rounded-full text-xs">{g.photos?.length || 0}</Badge></div>
                </Card>
              </Link>))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pagamentos" className="mt-5">
          {myInvoices.length === 0 ? <EmptyTab text="Sem pagamentos registados." /> : (
            <div className="space-y-3">{myInvoices.map((i) => (
              <Card key={i.id} className="p-4 border-border flex items-center justify-between">
                <div><p className="font-mono text-sm">{i.number}</p><p className="text-xs text-muted-foreground">{fmtDate(i.issue_date)}</p></div>
                <div className="flex items-center gap-3"><span className="font-display font-medium">{eur(i.total)}</span>
                  <Badge className={`rounded-full border capitalize ${i.status === "paga" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>{i.status}</Badge></div>
              </Card>))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-5">
          {history.length === 0 ? <EmptyTab text="Sem histórico." /> : (
            <div className="relative pl-6 border-l border-border space-y-5 ml-2">{history.map((h, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="relative">
                <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                <p className="text-sm">{h.text}</p><p className="text-xs text-muted-foreground">{fmtDate(h.date)}</p>
              </motion.div>))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contratos" className="mt-5"><EmptyTab text="Módulo de contratos em breve." /></TabsContent>
        <TabsContent value="orcamentos" className="mt-5"><EmptyTab text="Módulo de orçamentos em breve." /></TabsContent>
        <TabsContent value="mensagens" className="mt-5"><EmptyTab text="Módulo de mensagens em breve." /></TabsContent>
      </Tabs>
    </div>
  );
}

const Metric = ({ label, value }) => (
  <Card className="p-4 border-border"><p className="text-xs text-muted-foreground">{label}</p><p className="font-display text-xl font-medium mt-1">{value}</p></Card>
);
const EmptyTab = ({ text }) => (
  <Card className="p-12 border-dashed border-border flex items-center justify-center"><p className="text-sm text-muted-foreground">{text}</p></Card>
);
