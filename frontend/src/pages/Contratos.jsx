import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Trash2, FileText, PenLine, Send, CheckCircle2, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { api, fmtDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const status = {
  rascunho: { label: "Rascunho", cls: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20" },
  enviado: { label: "Enviado", cls: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  assinado: { label: "Assinado", cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  cancelado: { label: "Cancelado", cls: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
};

export default function Contratos() {
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const [signName, setSignName] = useState("");
  const [form, setForm] = useState({ client_name: "", title: "Contrato de prestação de serviços", template: "servicos", body: "" });

  const load = () => api.get("/contracts").then((r) => setContracts(r.data));
  useEffect(() => {
    load();
    api.get("/clients").then((r) => setClients(r.data));
    api.get("/templates").then((r) => setTemplates(r.data.contracts));
  }, []);

  const save = async () => {
    if (!form.client_name.trim()) return toast.error("O cliente é obrigatório");
    await api.post("/contracts", form);
    toast.success("Contrato criado");
    setOpen(false); setForm({ client_name: "", title: "Contrato de prestação de serviços", template: "servicos", body: "" }); load();
  };
  const setStatus = async (id, s) => { await api.patch(`/contracts/${id}/status`, { status: s }); toast.success("Estado atualizado"); load(); };
  const remove = async (id) => { await api.delete(`/contracts/${id}`); toast.success("Contrato removido"); load(); };
  const sign = async () => {
    if (!signName.trim()) return toast.error("Introduza o nome de assinatura");
    await api.post(`/contracts/${view.id}/sign`, { signer_name: signName });
    toast.success("Contrato assinado digitalmente");
    setView(null); setSignName(""); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{contracts.length} contratos · assinatura digital</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-contract-btn" className="rounded-lg gap-2 hover:-translate-y-0.5 transition-transform"><Plus className="h-4 w-4" /> Novo contrato</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display font-medium">Novo contrato</DialogTitle><DialogDescription>As variáveis do modelo são preenchidas automaticamente.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label>Modelo</Label>
                <Select value={form.template} onValueChange={(v) => setForm({ ...form, template: v, body: "" })}>
                  <SelectTrigger data-testid="contract-template-select" className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Cliente *</Label>
                <Select value={form.client_name} onValueChange={(v) => setForm({ ...form, client_name: v })}>
                  <SelectTrigger data-testid="contract-client-select" className="h-11 mt-1.5"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Título</Label><Input data-testid="contract-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11 mt-1.5" /></div>
              <div><Label>Texto (opcional — deixe vazio para usar o modelo)</Label><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="mt-1.5 min-h-[120px] font-mono text-xs" placeholder="Use {cliente}, {titulo}, {valor}, {data}" /></div>
            </div>
            <DialogFooter><Button data-testid="save-contract-btn" onClick={save} className="rounded-lg">Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {contracts.length === 0 ? (
        <Card className="p-16 border-dashed flex flex-col items-center text-center"><FileText className="h-10 w-10 text-muted-foreground mb-3" /><p className="font-display text-lg">Sem contratos</p></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {contracts.map((c, i) => {
            const st = status[c.status] || status.rascunho;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card data-testid={`contract-card-${c.id}`} className="p-5 border-border group hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between">
                    <div><p className="font-mono text-xs text-muted-foreground">{c.number}</p><p className="font-medium leading-tight mt-0.5">{c.title}</p><p className="text-xs text-muted-foreground">{c.client_name}</p></div>
                    <Badge className={`rounded-full border ${st.cls}`}>{st.label}</Badge>
                  </div>
                  {c.status === "assinado" && <p className="text-xs text-emerald-500 mt-3 flex items-center gap-1"><PenLine className="h-3.5 w-3.5" /> Assinado por {c.signer_name} · {fmtDate(c.signed_at)}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-border">
                    <Button size="sm" variant="ghost" data-testid={`contract-view-${c.id}`} onClick={() => setView(c)} className="h-8 rounded-lg gap-1 text-xs"><Eye className="h-3.5 w-3.5" /> Ver</Button>
                    {c.status === "rascunho" && <Button size="sm" variant="ghost" data-testid={`contract-send-${c.id}`} onClick={() => setStatus(c.id, "enviado")} className="h-8 rounded-lg gap-1 text-xs"><Send className="h-3.5 w-3.5" /> Enviar</Button>}
                    {c.status !== "assinado" && <Button size="sm" variant="ghost" data-testid={`contract-sign-open-${c.id}`} onClick={() => setView(c)} className="h-8 rounded-lg gap-1 text-xs text-emerald-500"><PenLine className="h-3.5 w-3.5" /> Assinar</Button>}
                    <Button size="sm" variant="ghost" data-testid={`contract-delete-${c.id}`} onClick={() => remove(c.id)} className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive ml-auto"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={!!view} onOpenChange={() => { setView(null); setSignName(""); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display font-medium">{view?.number}</DialogTitle><DialogDescription>{view?.title} — {view?.client_name}</DialogDescription></DialogHeader>
          {view && (
            <>
              <pre className="whitespace-pre-wrap text-sm bg-secondary/50 rounded-lg p-4 border border-border font-mono leading-relaxed">{view.body}</pre>
              {view.status === "assinado" ? (
                <div className="flex items-center gap-2 text-emerald-500 text-sm"><CheckCircle2 className="h-4 w-4" /> Assinado por {view.signer_name} em {fmtDate(view.signed_at)}</div>
              ) : (
                <div className="flex gap-2 items-end">
                  <div className="flex-1"><Label>Assinatura digital (nome completo)</Label><Input data-testid="sign-name-input" value={signName} onChange={(e) => setSignName(e.target.value)} className="h-11 mt-1.5" placeholder="O seu nome" /></div>
                  <Button data-testid="sign-confirm-btn" onClick={sign} className="h-11 rounded-lg gap-2"><PenLine className="h-4 w-4" /> Assinar</Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
