import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, MapPin, Calendar as CalIcon, Trash2, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { api, eur, fmtDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const statusColors = {
  planeado: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  em_curso: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  concluido: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};
const statusLabel = { planeado: "Planeado", em_curso: "Em curso", concluido: "Concluído" };
const empty = { title: "", client_name: "", type: "sessao", status: "planeado", date: "", location: "", budget: 0, description: "" };
const covers = [
  "https://images.pexels.com/photos/13699196/pexels-photo-13699196.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  "https://images.pexels.com/photos/7778888/pexels-photo-7778888.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
];

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = () => api.get("/projects").then((r) => setProjects(r.data));
  useEffect(() => { load(); api.get("/clients").then((r) => setClients(r.data)); }, []);

  const save = async () => {
    if (!form.title.trim()) return toast.error("O título é obrigatório");
    await api.post("/projects", { ...form, budget: Number(form.budget) || 0, cover: covers[projects.length % covers.length] });
    toast.success("Projeto criado");
    setOpen(false); setForm(empty); load();
  };
  const remove = async (id) => { await api.delete(`/projects/${id}`); toast.success("Projeto removido"); load(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{projects.length} projetos</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-project-btn" className="rounded-lg gap-2 hover:-translate-y-0.5 transition-transform"><Plus className="h-4 w-4" /> Novo projeto</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle className="font-display font-medium">Novo projeto</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="col-span-2"><Label>Título *</Label><Input data-testid="project-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11 mt-1.5" /></div>
              <div className="col-span-2"><Label>Cliente</Label>
                <Select value={form.client_name} onValueChange={(v) => setForm({ ...form, client_name: v })}>
                  <SelectTrigger data-testid="project-client-select" className="h-11 mt-1.5"><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sessao">Sessão</SelectItem><SelectItem value="casamento">Casamento</SelectItem>
                    <SelectItem value="moda">Moda</SelectItem><SelectItem value="produto">Produto</SelectItem><SelectItem value="retrato">Retrato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Estado</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="planeado">Planeado</SelectItem><SelectItem value="em_curso">Em curso</SelectItem><SelectItem value="concluido">Concluído</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Data</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="h-11 mt-1.5" /></div>
              <div><Label>Orçamento (€)</Label><Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="h-11 mt-1.5" /></div>
              <div className="col-span-2"><Label>Local</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="h-11 mt-1.5" /></div>
              <div className="col-span-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" /></div>
            </div>
            <DialogFooter><Button data-testid="save-project-btn" onClick={save} className="rounded-lg">Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <Card className="p-16 border-dashed flex flex-col items-center text-center"><FolderKanban className="h-10 w-10 text-muted-foreground mb-3" /><p className="font-display text-lg">Sem projetos</p></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card data-testid={`project-card-${p.id}`} className="overflow-hidden border-border group hover:border-primary/40 transition-colors p-0">
                <div className="relative h-40 overflow-hidden">
                  <img src={p.cover} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <Badge className={`absolute top-3 left-3 rounded-full border capitalize ${statusColors[p.status] || ""}`}>{statusLabel[p.status] || p.status}</Badge>
                  <Button variant="ghost" size="icon" data-testid={`delete-project-${p.id}`} onClick={() => remove(p.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-white hover:text-destructive bg-black/30 backdrop-blur h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-5">
                  <p className="text-xs uppercase tracking-wider text-primary font-semibold">{p.type}</p>
                  <p className="font-display text-lg font-medium mt-1 leading-tight">{p.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{p.client_name || "Sem cliente"}</p>
                  <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><CalIcon className="h-3.5 w-3.5" />{fmtDate(p.date)}</span>
                    {p.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{p.location}</span>}
                  </div>
                  <p className="font-display text-xl font-medium mt-3">{eur(p.budget)}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
