import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Mail, Phone, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const empty = { name: "", email: "", phone: "", company: "", notes: "", tags: "", status: "ativo" };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = () => api.get("/clients").then((r) => setClients(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim()) return toast.error("O nome é obrigatório");
    const payload = { ...form, tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [] };
    await api.post("/clients", payload);
    toast.success("Cliente adicionado");
    setOpen(false); setForm(empty); load();
  };

  const remove = async (id) => {
    await api.delete(`/clients/${id}`);
    toast.success("Cliente removido");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{clients.length} clientes registados</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-client-btn" className="rounded-lg gap-2 hover:-translate-y-0.5 transition-transform">
              <Plus className="h-4 w-4" /> Novo cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle className="font-display font-medium">Novo cliente</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="col-span-2"><Label>Nome *</Label><Input data-testid="client-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 mt-1.5" /></div>
              <div><Label>Email</Label><Input data-testid="client-email-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11 mt-1.5" /></div>
              <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-11 mt-1.5" /></div>
              <div><Label>Empresa</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="h-11 mt-1.5" /></div>
              <div><Label>Etiquetas</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="casamento, premium" className="h-11 mt-1.5" /></div>
              <div className="col-span-2"><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5" /></div>
            </div>
            <DialogFooter>
              <Button data-testid="save-client-btn" onClick={save} className="rounded-lg">Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {clients.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card data-testid={`client-card-${c.id}`} className="p-5 border-border group hover:border-primary/40 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-display font-semibold">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium leading-tight">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.company || "Particular"}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" data-testid={`delete-client-${c.id}`} onClick={() => remove(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  {c.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{c.email}</p>}
                  {c.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{c.phone}</p>}
                </div>
                {c.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {c.tags.map((t) => <Badge key={t} variant="secondary" className="rounded-full text-xs capitalize">{t}</Badge>)}
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

const EmptyState = () => (
  <Card className="p-16 border-dashed border-border flex flex-col items-center text-center">
    <Users className="h-10 w-10 text-muted-foreground mb-3" />
    <p className="font-display text-lg">Ainda sem clientes</p>
    <p className="text-sm text-muted-foreground">Adicione o seu primeiro cliente para começar.</p>
  </Card>
);
