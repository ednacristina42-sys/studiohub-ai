import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Plus, Images, ImageIcon, ArrowUpRight, Trash2, Lock, CalendarDays, User } from "lucide-react";
import { toast } from "sonner";
import { api, fmtDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusColor = {
  pendente: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  partilhada: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  entregue: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};
const empty = { title: "", client_name: "", session_id: "", type: "sessao", date: "", cover: "", description: "", password: "" };

export default function Galleries() {
  const [galleries, setGalleries] = useState([]);
  const [clients, setClients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = () => api.get("/galleries").then((r) => setGalleries(r.data));
  useEffect(() => {
    load();
    api.get("/clients").then((r) => setClients(r.data));
    api.get("/sessions").then((r) => setSessions(r.data));
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async () => {
    if (!form.title.trim()) return toast.error("O nome é obrigatório");
    await api.post("/galleries", form);
    toast.success("Galeria criada");
    setOpen(false); setForm(empty); load();
  };
  const remove = async (e, id) => { e.preventDefault(); await api.delete(`/galleries/${id}`); toast.success("Galeria removida"); load(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{galleries.length} galerias · entrega premium com seleção inteligente</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-gallery-btn" className="rounded-lg gap-2 hover:-translate-y-0.5 transition-transform"><Plus className="h-4 w-4" /> Nova galeria</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display font-medium">Nova galeria</DialogTitle><DialogDescription>Associe a um cliente e sessão. A palavra-passe é opcional.</DialogDescription></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="col-span-2"><Label>Nome *</Label><Input data-testid="gallery-title-input" value={form.title} onChange={set("title")} className="h-11 mt-1.5" /></div>
              <div><Label>Cliente</Label>
                <Select value={form.client_name} onValueChange={(v) => setForm({ ...form, client_name: v })}>
                  <SelectTrigger data-testid="gallery-client-select" className="h-11 mt-1.5"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Sessão</Label>
                <Select value={form.session_id} onValueChange={(v) => { const s = sessions.find((x) => x.id === v); setForm({ ...form, session_id: v, type: s?.type || form.type, date: s?.date || form.date, client_name: s?.client_name || form.client_name }); }}>
                  <SelectTrigger data-testid="gallery-session-select" className="h-11 mt-1.5"><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>{sessions.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="sessao">Sessão</SelectItem><SelectItem value="casamento">Casamento</SelectItem><SelectItem value="moda">Moda</SelectItem><SelectItem value="produto">Produto</SelectItem><SelectItem value="retrato">Retrato</SelectItem><SelectItem value="evento">Evento</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Data</Label><Input type="date" value={form.date} onChange={set("date")} className="h-11 mt-1.5" /></div>
              <div className="col-span-2"><Label>Capa (URL)</Label><Input data-testid="gallery-cover-input" value={form.cover} onChange={set("cover")} placeholder="https://..." className="h-11 mt-1.5" /></div>
              <div className="col-span-2"><Label>Descrição</Label><Textarea value={form.description} onChange={set("description")} className="mt-1.5" /></div>
              <div className="col-span-2"><Label>Palavra-passe (opcional)</Label><Input data-testid="gallery-password-create" value={form.password} onChange={set("password")} className="h-11 mt-1.5" placeholder="Proteção do link do cliente" /></div>
            </div>
            <DialogFooter><Button data-testid="save-gallery-btn" onClick={save} className="rounded-lg">Criar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {galleries.length === 0 ? (
        <Card className="p-16 border-dashed flex flex-col items-center text-center"><Images className="h-10 w-10 text-muted-foreground mb-3" /><p className="font-display text-lg">Sem galerias</p></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleries.map((g, i) => {
            const selected = g.photos?.filter((p) => p.client_selected).length || 0;
            return (
              <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card data-testid={`gallery-card-${g.id}`} className="overflow-hidden border-border group hover:border-primary/40 transition-colors p-0">
                  <Link to={`/galerias/${g.id}`}>
                    <div className="relative h-44 overflow-hidden bg-secondary">
                      {g.cover ? <img src={g.cover} alt={g.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="h-full flex items-center justify-center text-muted-foreground"><ImageIcon className="h-10 w-10" /></div>}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <Badge className={`absolute top-3 left-3 rounded-full border capitalize ${statusColor[g.status] || ""}`}>{g.status}</Badge>
                      {g.password && <span className="absolute top-3 right-3 h-7 w-7 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white" title="Protegida"><Lock className="h-3.5 w-3.5" /></span>}
                      <div className="absolute bottom-3 left-4 right-4">
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">{g.type}</p>
                        <p className="font-display text-lg font-medium text-white leading-tight">{g.title}</p>
                      </div>
                    </div>
                  </Link>
                  <div className="p-4">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 truncate"><User className="h-3.5 w-3.5" />{g.client_name || "—"}</span>
                      <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{fmtDate(g.date || g.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="rounded-full text-xs">{g.photos?.length || 0} fotos</Badge>
                        {selected > 0 && <Badge className="rounded-full bg-primary/10 text-primary border border-primary/20 text-xs">{selected} selec.</Badge>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Link to={`/galerias/${g.id}`}><Button size="sm" data-testid={`gallery-open-${g.id}`} className="h-8 rounded-lg gap-1">Abrir <ArrowUpRight className="h-3.5 w-3.5" /></Button></Link>
                        <Button variant="ghost" size="icon" data-testid={`delete-gallery-${g.id}`} onClick={(e) => remove(e, g.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
