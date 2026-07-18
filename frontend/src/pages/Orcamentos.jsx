import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Trash2, X, FileSpreadsheet, Send, CheckCircle2, XCircle, FileText, Receipt, Sparkles, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { api, eur, fmtDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const status = {
  rascunho: { label: "Rascunho", cls: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20" },
  enviado: { label: "Enviado", cls: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  aprovado: { label: "Aprovado", cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  rejeitado: { label: "Rejeitado", cls: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
  convertido: { label: "Convertido", cls: "bg-violet-500/10 text-violet-500 border-violet-500/20" },
};

export default function Orcamentos() {
  const [quotes, setQuotes] = useState([]);
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ client_name: "", title: "Proposta fotográfica", tax_rate: 23, valid_until: "", template: "personalizado" });
  const [items, setItems] = useState([{ description: "", quantity: 1, price: 0 }]);

  const load = () => api.get("/quotes").then((r) => setQuotes(r.data));
  useEffect(() => {
    load();
    api.get("/clients").then((r) => setClients(r.data));
    api.get("/templates").then((r) => setTemplates(r.data.quotes));
  }, []);

  const applyTemplate = (id) => {
    const t = templates.find((x) => x.id === id);
    if (t) { setItems(t.items.map((i) => ({ ...i }))); setForm((f) => ({ ...f, template: id, tax_rate: t.tax_rate })); }
    else setForm((f) => ({ ...f, template: "personalizado" }));
  };

  const total = () => {
    const sub = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);
    return sub + sub * (Number(form.tax_rate) || 0) / 100;
  };
  const updateItem = (idx, k, v) => setItems(items.map((it, i) => i === idx ? { ...it, [k]: v } : it));

  const save = async () => {
    if (!form.client_name.trim()) return toast.error("O cliente é obrigatório");
    const clean = items.filter((i) => i.description.trim()).map((i) => ({ description: i.description, quantity: Number(i.quantity) || 1, price: Number(i.price) || 0 }));
    if (!clean.length) return toast.error("Adicione pelo menos um item");
    await api.post("/quotes", { ...form, tax_rate: Number(form.tax_rate) || 0, items: clean });
    toast.success("Orçamento criado");
    setOpen(false); setForm({ client_name: "", title: "Proposta fotográfica", tax_rate: 23, valid_until: "", template: "personalizado" }); setItems([{ description: "", quantity: 1, price: 0 }]); load();
  };

  const setStatus = async (id, s) => { await api.patch(`/quotes/${id}/status`, { status: s }); toast.success("Estado atualizado"); load(); };
  const remove = async (id) => { await api.delete(`/quotes/${id}`); toast.success("Orçamento removido"); load(); };
  const toInvoice = async (id) => { await api.post(`/quotes/${id}/convert-to-invoice`); toast.success("Fatura criada a partir do orçamento"); load(); };
  const toContract = async (id) => { await api.post(`/quotes/${id}/convert-to-contract`); toast.success("Contrato criado a partir do orçamento"); load(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{quotes.length} orçamentos · aprovação e conversão automática</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-quote-btn" className="rounded-lg gap-2 hover:-translate-y-0.5 transition-transform"><Plus className="h-4 w-4" /> Novo orçamento</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display font-medium">Novo orçamento</DialogTitle><DialogDescription>Escolha um template ou crie de raiz.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label>Template</Label>
                <Select value={form.template} onValueChange={applyTemplate}>
                  <SelectTrigger data-testid="quote-template-select" className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="personalizado">Personalizado</SelectItem>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Cliente *</Label>
                  <Select value={form.client_name} onValueChange={(v) => setForm({ ...form, client_name: v })}>
                    <SelectTrigger data-testid="quote-client-select" className="h-11 mt-1.5"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Válido até</Label><Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="h-11 mt-1.5" /></div>
              </div>
              <div><Label>Título</Label><Input data-testid="quote-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11 mt-1.5" /></div>
              <div>
                <Label>Itens</Label>
                <div className="space-y-2 mt-1.5">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input placeholder="Descrição" data-testid={`quote-item-${idx}`} value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} className="h-10 flex-1" />
                      <Input type="number" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} className="h-10 w-16" />
                      <Input type="number" value={it.price} onChange={(e) => updateItem(idx, "price", e.target.value)} className="h-10 w-24" />
                      {items.length > 1 && <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="h-10 w-10 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></Button>}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" data-testid="quote-add-item" onClick={() => setItems([...items, { description: "", quantity: 1, price: 0 }])} className="rounded-lg gap-1"><Plus className="h-3.5 w-3.5" /> Item</Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Label>IVA %</Label><Input type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} className="h-10 w-20" /></div>
                <p className="font-display text-xl font-medium">{eur(total())}</p>
              </div>
            </div>
            <DialogFooter><Button data-testid="save-quote-btn" onClick={save} className="rounded-lg">Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {quotes.length === 0 ? (
        <Card className="p-16 border-dashed flex flex-col items-center text-center"><FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-3" /><p className="font-display text-lg">Sem orçamentos</p></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {quotes.map((q, i) => {
            const st = status[q.status] || status.rascunho;
            return (
              <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card data-testid={`quote-card-${q.id}`} className="p-5 border-border group hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between">
                    <div><p className="font-mono text-xs text-muted-foreground">{q.number}</p><p className="font-medium leading-tight mt-0.5">{q.title}</p><p className="text-xs text-muted-foreground">{q.client_name}</p></div>
                    <Badge className={`rounded-full border ${st.cls}`}>{st.label}</Badge>
                  </div>
                  <p className="font-display text-2xl font-medium mt-4">{eur(q.total)}</p>
                  <p className="text-xs text-muted-foreground">{q.valid_until ? `Válido até ${fmtDate(q.valid_until)}` : "Sem validade"}</p>
                  <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-border">
                    <Button size="sm" variant="ghost" data-testid={`quote-preview-${q.id}`} onClick={() => setPreview(q)} className="h-8 rounded-lg gap-1 text-xs"><Eye className="h-3.5 w-3.5" /> Ver</Button>
                    {q.status === "rascunho" && <Button size="sm" variant="ghost" data-testid={`quote-send-${q.id}`} onClick={() => setStatus(q.id, "enviado")} className="h-8 rounded-lg gap-1 text-xs"><Send className="h-3.5 w-3.5" /> Enviar</Button>}
                    {q.status === "enviado" && <Button size="sm" variant="ghost" data-testid={`quote-approve-${q.id}`} onClick={() => setStatus(q.id, "aprovado")} className="h-8 rounded-lg gap-1 text-xs text-emerald-500"><CheckCircle2 className="h-3.5 w-3.5" /> Aprovar</Button>}
                    {q.status === "enviado" && <Button size="sm" variant="ghost" onClick={() => setStatus(q.id, "rejeitado")} className="h-8 rounded-lg gap-1 text-xs text-rose-500"><XCircle className="h-3.5 w-3.5" /> Rejeitar</Button>}
                    {q.status === "aprovado" && <>
                      <Button size="sm" variant="ghost" data-testid={`quote-to-contract-${q.id}`} onClick={() => toContract(q.id)} className="h-8 rounded-lg gap-1 text-xs"><FileText className="h-3.5 w-3.5" /> Contrato</Button>
                      <Button size="sm" variant="ghost" data-testid={`quote-to-invoice-${q.id}`} onClick={() => toInvoice(q.id)} className="h-8 rounded-lg gap-1 text-xs"><Receipt className="h-3.5 w-3.5" /> Fatura</Button>
                    </>}
                    <Button size="sm" variant="ghost" data-testid={`quote-delete-${q.id}`} onClick={() => remove(q.id)} className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive ml-auto"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display font-medium flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />{preview?.number}</DialogTitle><DialogDescription>{preview?.client_name}</DialogDescription></DialogHeader>
          {preview && (
            <div className="space-y-3">
              <p className="font-medium">{preview.title}</p>
              <div className="border border-border rounded-lg divide-y divide-border">
                {preview.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between p-3 text-sm"><span>{it.description} <span className="text-muted-foreground">×{it.quantity}</span></span><span className="font-medium">{eur(it.quantity * it.price)}</span></div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground"><span>Subtotal</span><span>{eur(preview.subtotal)}</span></div>
              <div className="flex items-center justify-between text-sm text-muted-foreground"><span>IVA ({preview.tax_rate}%)</span><span>{eur(preview.tax)}</span></div>
              <div className="flex items-center justify-between font-display text-xl font-medium pt-2 border-t border-border"><span>Total</span><span>{eur(preview.total)}</span></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
