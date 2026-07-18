import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Plus, Images, ImageIcon, ArrowUpRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function Galleries() {
  const [galleries, setGalleries] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", client_name: "" });

  const load = () => api.get("/galleries").then((r) => setGalleries(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title.trim()) return toast.error("O título é obrigatório");
    await api.post("/galleries", form);
    toast.success("Galeria criada");
    setOpen(false); setForm({ title: "", client_name: "" }); load();
  };
  const remove = async (e, id) => { e.preventDefault(); await api.delete(`/galleries/${id}`); toast.success("Galeria removida"); load(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{galleries.length} galerias · seleção inteligente por IA</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-gallery-btn" className="rounded-lg gap-2 hover:-translate-y-0.5 transition-transform"><Plus className="h-4 w-4" /> Nova galeria</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="font-display font-medium">Nova galeria</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label>Título *</Label><Input data-testid="gallery-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11 mt-1.5" /></div>
              <div><Label>Cliente</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="h-11 mt-1.5" /></div>
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
            const selected = g.photos?.filter((p) => p.ai_selected).length || 0;
            return (
              <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/galerias/${g.id}`} data-testid={`gallery-card-${g.id}`}>
                  <Card className="overflow-hidden border-border group hover:border-primary/40 transition-colors p-0">
                    <div className="relative h-48 overflow-hidden bg-secondary">
                      {g.cover ? (
                        <img src={g.cover} alt={g.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground"><ImageIcon className="h-10 w-10" /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                        <div>
                          <p className="font-display text-lg font-medium text-white leading-tight">{g.title}</p>
                          <p className="text-xs text-white/70">{g.client_name || "—"}</p>
                        </div>
                        <ArrowUpRight className="h-5 w-5 text-white/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                      <Button variant="ghost" size="icon" data-testid={`delete-gallery-${g.id}`} onClick={(e) => remove(e, g.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-white hover:text-destructive bg-black/30 backdrop-blur h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <Badge variant="secondary" className="rounded-full">{g.photos?.length || 0} fotos</Badge>
                      {selected > 0 && <Badge className="rounded-full bg-primary/10 text-primary border border-primary/20">{selected} escolhas IA</Badge>}
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
