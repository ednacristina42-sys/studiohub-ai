import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";
import { api, fmtDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const typeColors = {
  casamento: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  moda: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  produto: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  sessao: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  reuniao: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};
const empty = { title: "", client_name: "", date: "", time: "", type: "sessao", location: "" };

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = () => api.get("/events").then((r) => setEvents(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title.trim() || !form.date) return toast.error("Título e data são obrigatórios");
    await api.post("/events", form);
    toast.success("Sessão agendada");
    setOpen(false); setForm(empty); load();
  };
  const remove = async (id) => { await api.delete(`/events/${id}`); toast.success("Sessão removida"); load(); };

  const grouped = events.reduce((acc, e) => { (acc[e.date] = acc[e.date] || []).push(e); return acc; }, {});
  const dates = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{events.length} sessões agendadas</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-event-btn" className="rounded-lg gap-2 hover:-translate-y-0.5 transition-transform"><Plus className="h-4 w-4" /> Agendar</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="font-display font-medium">Nova sessão</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label>Título *</Label><Input data-testid="event-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11 mt-1.5" /></div>
              <div><Label>Cliente</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="h-11 mt-1.5" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Data *</Label><Input type="date" data-testid="event-date-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="h-11 mt-1.5" /></div>
                <div><Label>Hora</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="h-11 mt-1.5" /></div>
              </div>
              <div><Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sessao">Sessão</SelectItem><SelectItem value="casamento">Casamento</SelectItem>
                    <SelectItem value="moda">Moda</SelectItem><SelectItem value="produto">Produto</SelectItem><SelectItem value="reuniao">Reunião</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Local</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="h-11 mt-1.5" /></div>
            </div>
            <DialogFooter><Button data-testid="save-event-btn" onClick={save} className="rounded-lg">Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {dates.length === 0 ? (
        <Card className="p-16 border-dashed flex flex-col items-center text-center"><Clock className="h-10 w-10 text-muted-foreground mb-3" /><p className="font-display text-lg">Sem sessões agendadas</p></Card>
      ) : (
        <div className="space-y-6">
          {dates.map((d) => (
            <div key={d}>
              <div className="flex items-center gap-3 mb-3">
                <p className="font-display font-medium">{fmtDate(d)}</p>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped[d].map((e, i) => (
                  <motion.div key={e.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card data-testid={`event-card-${e.id}`} className="p-5 border-border group hover:border-primary/40 transition-colors border-l-2 border-l-primary">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge className={`rounded-full border capitalize mb-2 ${typeColors[e.type] || ""}`}>{e.type}</Badge>
                          <p className="font-medium leading-tight">{e.title}</p>
                          <p className="text-xs text-muted-foreground">{e.client_name}</p>
                        </div>
                        <Button variant="ghost" size="icon" data-testid={`delete-event-${e.id}`} onClick={() => remove(e.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        {e.time && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{e.time}</span>}
                        {e.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{e.location}</span>}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
