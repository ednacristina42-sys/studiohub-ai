import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Star, Mail, Phone, Trash2, Users, Filter } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const empty = {
  name: "", email: "", phone: "", whatsapp: "", address: "", nif: "", birthdate: "",
  client_type: "particular", status: "ativo", origin: "instagram", company: "", tags: "", notes: "",
};
const statusColor = {
  ativo: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  lead: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  potencial: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  inativo: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [favOnly, setFavOnly] = useState(false);
  const navigate = useNavigate();

  const load = () => api.get("/clients").then((r) => setClients(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim()) return toast.error("O nome é obrigatório");
    const payload = { ...form, tags: form.tags ? String(form.tags).split(",").map((t) => t.trim()).filter(Boolean) : [] };
    await api.post("/clients", payload);
    toast.success("Cliente criado");
    setOpen(false); setForm(empty); load();
  };
  const remove = async (e, id) => { e.stopPropagation(); await api.delete(`/clients/${id}`); toast.success("Cliente removido"); load(); };
  const toggleFav = async (e, id) => { e.stopPropagation(); await api.patch(`/clients/${id}/favorite`); load(); };

  const filtered = useMemo(() => clients.filter((c) => {
    const matchQ = !q || [c.name, c.email, c.phone, c.company].join(" ").toLowerCase().includes(q.toLowerCase());
    const matchS = statusFilter === "todos" || c.status === statusFilter;
    const matchF = !favOnly || c.favorite;
    return matchQ && matchS && matchF;
  }), [clients, q, statusFilter, favOnly]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
        <div className="flex flex-1 flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input data-testid="client-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar clientes..." className="h-11 pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger data-testid="client-status-filter" className="h-11 w-40 gap-2"><Filter className="h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os estados</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={favOnly ? "default" : "outline"} data-testid="client-fav-filter" onClick={() => setFavOnly(!favOnly)} className="h-11 rounded-lg gap-2">
            <Star className={`h-4 w-4 ${favOnly ? "fill-current" : ""}`} /> Favoritos
          </Button>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-client-btn" className="h-11 rounded-lg gap-2 hover:-translate-y-0.5 transition-transform"><Plus className="h-4 w-4" /> Novo cliente</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display font-medium">Novo cliente</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="col-span-2"><Label>Nome *</Label><Input data-testid="client-name-input" value={form.name} onChange={set("name")} className="h-11 mt-1.5" /></div>
              <div><Label>Email</Label><Input data-testid="client-email-input" value={form.email} onChange={set("email")} className="h-11 mt-1.5" /></div>
              <div><Label>Telefone</Label><Input value={form.phone} onChange={set("phone")} className="h-11 mt-1.5" /></div>
              <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={set("whatsapp")} className="h-11 mt-1.5" /></div>
              <div><Label>NIF</Label><Input value={form.nif} onChange={set("nif")} className="h-11 mt-1.5" /></div>
              <div className="col-span-2"><Label>Morada</Label><Input value={form.address} onChange={set("address")} className="h-11 mt-1.5" /></div>
              <div><Label>Data de nascimento</Label><Input type="date" value={form.birthdate} onChange={set("birthdate")} className="h-11 mt-1.5" /></div>
              <div><Label>Empresa</Label><Input value={form.company} onChange={set("company")} className="h-11 mt-1.5" /></div>
              <div><Label>Tipo</Label>
                <Select value={form.client_type} onValueChange={(v) => setForm({ ...form, client_type: v })}>
                  <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="particular">Particular</SelectItem><SelectItem value="empresa">Empresa</SelectItem><SelectItem value="casamento">Casamento</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Estado</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="lead">Lead</SelectItem><SelectItem value="inativo">Inativo</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Origem</Label>
                <Select value={form.origin} onValueChange={(v) => setForm({ ...form, origin: v })}>
                  <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="instagram">Instagram</SelectItem><SelectItem value="google">Google</SelectItem><SelectItem value="website">Website</SelectItem><SelectItem value="recomendacao">Recomendação</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Etiquetas</Label><Input value={form.tags} onChange={set("tags")} placeholder="casamento, premium" className="h-11 mt-1.5" /></div>
              <div className="col-span-2"><Label>Notas</Label><Textarea value={form.notes} onChange={set("notes")} className="mt-1.5" /></div>
            </div>
            <DialogFooter><Button data-testid="save-client-btn" onClick={save} className="rounded-lg">Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} de {clients.length} clientes</p>

      {filtered.length === 0 ? (
        <Card className="p-16 border-dashed flex flex-col items-center text-center"><Users className="h-10 w-10 text-muted-foreground mb-3" /><p className="font-display text-lg">Sem clientes</p></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card data-testid={`client-card-${c.id}`} onClick={() => navigate(`/clientes/${c.id}`)}
                className="p-5 border-border group hover:border-primary/40 transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11"><AvatarImage src={c.photo} /><AvatarFallback className="bg-accent text-accent-foreground font-display font-semibold">{c.name.charAt(0)}</AvatarFallback></Avatar>
                    <div>
                      <p className="font-medium leading-tight flex items-center gap-1.5">{c.name}{c.favorite && <Star className="h-3.5 w-3.5 text-primary fill-primary" />}</p>
                      <p className="text-xs text-muted-foreground">{c.company || (c.client_type === "empresa" ? "Empresa" : "Particular")}</p>
                    </div>
                  </div>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" data-testid={`fav-client-${c.id}`} onClick={(e) => toggleFav(e, c.id)} className="h-8 w-8 text-muted-foreground hover:text-primary"><Star className={`h-4 w-4 ${c.favorite ? "fill-primary text-primary" : ""}`} /></Button>
                    <Button variant="ghost" size="icon" data-testid={`delete-client-${c.id}`} onClick={(e) => remove(e, c.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  {c.email && <p className="flex items-center gap-2 truncate"><Mail className="h-3.5 w-3.5 shrink-0" />{c.email}</p>}
                  {c.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{c.phone}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-4">
                  <Badge className={`rounded-full text-xs border capitalize ${statusColor[c.status] || ""}`}>{c.status}</Badge>
                  {c.tags?.map((t) => <Badge key={t} variant="secondary" className="rounded-full text-xs capitalize">{t}</Badge>)}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
