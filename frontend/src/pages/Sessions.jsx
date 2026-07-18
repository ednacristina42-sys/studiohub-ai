import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Plus, List, LayoutGrid, CalendarDays, MapPin, Clock, Trash2, ChevronLeft, ChevronRight, Camera, User, Images,
} from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, addMonths, isSameMonth, isSameDay, parseISO,
} from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { api, eur, fmtDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const KANBAN = [
  { key: "agendada", label: "Agendada", color: "border-t-blue-500" },
  { key: "confirmada", label: "Confirmada", color: "border-t-amber-500" },
  { key: "realizada", label: "Realizada", color: "border-t-violet-500" },
  { key: "entregue", label: "Entregue", color: "border-t-emerald-500" },
];
const statusColor = {
  agendada: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  confirmada: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  realizada: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  entregue: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  cancelada: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};
const empty = { title: "", type: "retrato", client_name: "", date: "", time: "", location: "", status: "agendada", photographer: "Estúdio", value: 0, notes: "" };

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [clients, setClients] = useState([]);
  const [view, setView] = useState("lista");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [month, setMonth] = useState(new Date());
  const [drag, setDrag] = useState(null);
  const navigate = useNavigate();

  const load = () => api.get("/sessions").then((r) => setSessions(r.data));
  useEffect(() => { load(); api.get("/clients").then((r) => setClients(r.data)); }, []);

  const createGallery = async (sid) => {
    const r = await api.post(`/sessions/${sid}/gallery`);
    toast.success("Galeria criada para a sessão");
    navigate(`/galerias/${r.data.id}`);
  };

  const save = async () => {
    if (!form.title.trim() || !form.date) return toast.error("Título e data são obrigatórios");
    await api.post("/sessions", { ...form, value: Number(form.value) || 0 });
    toast.success("Sessão criada");
    setOpen(false); setForm(empty); load();
  };
  const remove = async (id) => { await api.delete(`/sessions/${id}`); toast.success("Sessão removida"); load(); };
  const setStatus = async (id, status) => { await api.patch(`/sessions/${id}/status`, { status }); load(); };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const days = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  }), [month]);

  const onDrop = (status) => { if (drag) { setStatus(drag, status); setDrag(null); } };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border p-1 bg-secondary/50">
          {[{ k: "lista", i: List }, { k: "calendario", i: CalendarDays }, { k: "kanban", i: LayoutGrid }].map((v) => (
            <button key={v.k} data-testid={`view-${v.k}`} onClick={() => setView(v.k)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${view === v.k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <v.i className="h-4 w-4" /> {v.k}
            </button>
          ))}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-session-btn" className="rounded-lg gap-2 hover:-translate-y-0.5 transition-transform"><Plus className="h-4 w-4" /> Nova sessão</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display font-medium">Nova sessão</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="col-span-2"><Label>Título *</Label><Input data-testid="session-title-input" value={form.title} onChange={set("title")} className="h-11 mt-1.5" /></div>
              <div><Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="retrato">Retrato</SelectItem><SelectItem value="casamento">Casamento</SelectItem><SelectItem value="moda">Moda</SelectItem><SelectItem value="produto">Produto</SelectItem><SelectItem value="batizado">Batizado</SelectItem><SelectItem value="evento">Evento</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Cliente</Label>
                <Select value={form.client_name} onValueChange={(v) => setForm({ ...form, client_name: v })}>
                  <SelectTrigger data-testid="session-client-select" className="h-11 mt-1.5"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Data *</Label><Input type="date" data-testid="session-date-input" value={form.date} onChange={set("date")} className="h-11 mt-1.5" /></div>
              <div><Label>Hora</Label><Input type="time" value={form.time} onChange={set("time")} className="h-11 mt-1.5" /></div>
              <div><Label>Estado</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{KANBAN.map((k) => <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>)}<SelectItem value="cancelada">Cancelada</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Valor (€)</Label><Input type="number" value={form.value} onChange={set("value")} className="h-11 mt-1.5" /></div>
              <div><Label>Fotógrafo</Label><Input value={form.photographer} onChange={set("photographer")} className="h-11 mt-1.5" /></div>
              <div className="col-span-2"><Label>Local</Label><Input value={form.location} onChange={set("location")} className="h-11 mt-1.5" /></div>
              <div className="col-span-2"><Label>Observações</Label><Textarea value={form.notes} onChange={set("notes")} className="mt-1.5" /></div>
            </div>
            <DialogFooter><Button data-testid="save-session-btn" onClick={save} className="rounded-lg">Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* LISTA */}
      {view === "lista" && (
        sessions.length === 0 ? <Empty /> : (
          <div className="space-y-3">
            {sessions.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card data-testid={`session-row-${s.id}`} className="p-4 border-border group hover:border-primary/40 transition-colors flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-11 w-11 rounded-lg bg-accent flex items-center justify-center text-primary shrink-0"><Camera className="h-5 w-5" /></div>
                    <div className="min-w-0"><p className="font-medium truncate">{s.title}</p><p className="text-xs text-muted-foreground capitalize flex items-center gap-2"><User className="h-3 w-3" />{s.client_name || "—"} · {s.type}</p></div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{fmtDate(s.date)}</span>
                    {s.time && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{s.time}</span>}
                    {s.location && <span className="hidden md:flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{s.location}</span>}
                  </div>
                  <span className="font-display font-medium">{eur(s.value)}</span>
                  <Select value={s.status} onValueChange={(v) => setStatus(s.id, v)}>
                    <SelectTrigger data-testid={`session-status-${s.id}`} className={`h-8 w-32 rounded-full border text-xs capitalize ${statusColor[s.status] || ""}`}><SelectValue /></SelectTrigger>
                    <SelectContent>{KANBAN.map((k) => <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>)}<SelectItem value="cancelada">Cancelada</SelectItem></SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" data-testid={`session-gallery-${s.id}`} onClick={() => createGallery(s.id)} title="Criar galeria" className="text-muted-foreground hover:text-primary h-8 w-8"><Images className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" data-testid={`delete-session-${s.id}`} onClick={() => remove(s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                </Card>
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* CALENDARIO */}
      {view === "calendario" && (
        <Card className="p-4 md:p-6 border-border">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg font-medium capitalize">{format(month, "MMMM yyyy", { locale: pt })}</h3>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" data-testid="cal-prev" onClick={() => setMonth(addMonths(month, -1))} className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" data-testid="cal-next" onClick={() => setMonth(addMonths(month, 1))} className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>)}
            {days.map((day) => {
              const daySessions = sessions.filter((s) => s.date && isSameDay(parseISO(s.date), day));
              return (
                <div key={day.toISOString()} className={`min-h-[84px] rounded-lg border p-1.5 ${isSameMonth(day, month) ? "border-border bg-secondary/30" : "border-transparent opacity-40"} ${isSameDay(day, new Date()) ? "ring-1 ring-primary" : ""}`}>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{format(day, "d")}</p>
                  <div className="space-y-1">
                    {daySessions.slice(0, 3).map((s) => (
                      <div key={s.id} className={`text-[10px] leading-tight rounded px-1.5 py-0.5 border truncate capitalize ${statusColor[s.status] || ""}`} title={s.title}>{s.time && `${s.time} `}{s.title}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* KANBAN */}
      {view === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {KANBAN.map((col) => {
            const items = sessions.filter((s) => s.status === col.key);
            return (
              <div key={col.key} data-testid={`kanban-col-${col.key}`} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(col.key)}
                className={`rounded-xl border border-border border-t-2 ${col.color} bg-secondary/30 p-3 min-h-[200px]`}>
                <div className="flex items-center justify-between mb-3 px-1"><p className="font-medium text-sm">{col.label}</p><Badge variant="secondary" className="rounded-full text-xs">{items.length}</Badge></div>
                <div className="space-y-2">
                  {items.map((s) => (
                    <div key={s.id} draggable onDragStart={() => setDrag(s.id)} data-testid={`kanban-card-${s.id}`}
                      className="rounded-lg bg-background border border-border p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors">
                      <p className="text-sm font-medium leading-tight">{s.title}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">{s.client_name} · {s.type}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">{fmtDate(s.date)}</span>
                        <span className="text-xs font-display font-medium">{eur(s.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const Empty = () => (
  <Card className="p-16 border-dashed flex flex-col items-center text-center"><Camera className="h-10 w-10 text-muted-foreground mb-3" /><p className="font-display text-lg">Sem sessões</p><p className="text-sm text-muted-foreground">Crie a sua primeira sessão.</p></Card>
);
