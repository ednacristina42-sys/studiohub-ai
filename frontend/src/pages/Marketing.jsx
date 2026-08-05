import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Sparkles, Copy, Check, Loader2, Pencil, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { api, fmtDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PLATFORMS = [
  { v: "instagram", l: "Instagram" },
  { v: "facebook", l: "Facebook" },
  { v: "linkedin", l: "LinkedIn" },
  { v: "tiktok", l: "TikTok" },
  { v: "email", l: "Email" },
  { v: "outro", l: "Outro" },
];
const STATUS = {
  ideia: { label: "Ideia", cls: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20" },
  agendado: { label: "Agendado", cls: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  publicado: { label: "Publicado", cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
};
const emptyForm = { id: null, title: "", platform: "instagram", date: "", content: "", status: "ideia" };

export default function Marketing() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [gen, setGen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const load = () =>
    api.get("/marketing/content").then((r) => setItems(r.data || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(emptyForm); setOpen(true); };
  const openEdit = (it) =>
    { setForm({ id: it.id, title: it.title || "", platform: it.platform || "instagram", date: (it.date || "").slice(0, 10), content: it.content || "", status: it.status || "ideia" }); setOpen(true); };

  const save = async () => {
    if (!form.title.trim()) return toast.error("O título é obrigatório.");
    const body = { title: form.title, platform: form.platform, date: form.date, content: form.content, status: form.status };
    try {
      if (form.id) await api.patch(`/marketing/content/${form.id}`, body);
      else await api.post("/marketing/content", body);
      toast.success(form.id ? "Publicação atualizada" : "Publicação criada");
      setOpen(false); load();
    } catch { toast.error("Não foi possível guardar."); }
  };
  const remove = async (id) => { try { await api.delete(`/marketing/content/${id}`); toast.success("Removido"); load(); } catch { toast.error("Erro ao remover."); } };
  const setStatus = async (id, s) => { try { await api.patch(`/marketing/content/${id}`, { status: s }); load(); } catch {} };
  const generate = async () => {
    if (!form.title.trim()) return toast.error("Escreve primeiro um tema no título.");
    setGen(true);
    try {
      const r = await api.post("/marketing/generate", { platform: form.platform, theme: form.title });
      setForm((f) => ({ ...f, content: r.data.content }));
    } catch { toast.error("Não foi possível gerar."); }
    finally { setGen(false); }
  };
  const copy = async (it) => {
    try { await navigator.clipboard.writeText(it.content || ""); setCopiedId(it.id); setTimeout(() => setCopiedId(null), 1500); }
    catch { toast.error("Não foi possível copiar."); }
  };

  const sorted = useMemo(() => [...(items || [])].sort((a, b) => (a.date || "").localeCompare(b.date || "")), [items]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-light tracking-tight">Marketing</h1>
          <p className="text-muted-foreground mt-1">Planeia e organiza as tuas publicações — com ajuda da IA.</p>
        </div>
        <Button onClick={openNew} className="rounded-lg gap-2"><Plus className="h-4 w-4" /> Nova publicação</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : sorted.length === 0 ? (
        <Card className="p-10 text-center border-border">
          <CalendarDays className="h-10 w-10 mx-auto text-primary mb-3" />
          <p className="text-muted-foreground">Ainda não tens publicações planeadas. Cria a primeira em “Nova publicação”.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((it) => (
            <motion.div key={it.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-4 border-border">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{it.title}</span>
                      <Badge variant="outline">{(PLATFORMS.find((p) => p.v === it.platform) || {}).l || it.platform}</Badge>
                      <Badge variant="outline" className={(STATUS[it.status] || STATUS.ideia).cls}>{(STATUS[it.status] || STATUS.ideia).label}</Badge>
                      {it.date && <span className="text-xs text-muted-foreground">· {fmtDate(it.date)}</span>}
                    </div>
                    {it.content && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{it.content}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {it.content && (
                      <Button size="icon" variant="ghost" onClick={() => copy(it)} title="Copiar">
                        {copiedId === it.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => openEdit(it)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(it.id)} title="Apagar"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="flex gap-1 mt-3">
                  {Object.keys(STATUS).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(it.id, s)}
                      className={`text-xs px-2 py-1 rounded-md border ${it.status === s ? STATUS[s].cls : "border-border text-muted-foreground"}`}
                    >
                      {STATUS[s].label}
                    </button>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display font-medium">{form.id ? "Editar publicação" : "Nova publicação"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título / tema</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Promoção de sessões de Natal" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Plataforma</Label>
                <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(STATUS).map((s) => <SelectItem key={s} value={s}>{STATUS[s].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Conteúdo</Label>
                <Button size="sm" variant="outline" className="gap-2 rounded-lg" disabled={gen} onClick={generate}>
                  {gen ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar com IA
                </Button>
              </div>
              <Textarea rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Escreve ou gera com IA a partir do tema." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="rounded-lg">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
