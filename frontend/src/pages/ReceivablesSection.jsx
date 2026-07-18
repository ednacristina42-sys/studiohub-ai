import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Pencil, CheckCircle2, Clock, AlertTriangle, PiggyBank, Search, ArrowUpDown, CreditCard, HandCoins } from "lucide-react";
import { toast } from "sonner";
import { api, eur, fmtDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const METHODS = ["Transferência", "MB Way", "Multibanco", "Dinheiro", "Cartão", "Cheque"];

const statusMap = {
  pendente: { label: "Pendente", cls: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: Clock },
  parcial: { label: "Parcial", cls: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: HandCoins },
  pago: { label: "Pago", cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2 },
  vencido: { label: "Vencido", cls: "bg-rose-500/10 text-rose-500 border-rose-500/20", icon: AlertTriangle },
};

const emptyForm = { client_name: "", project: "", total: "", received: "", due_date: "", method: "" };

export default function ReceivablesSection({ onChanged }) {
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const [sortAsc, setSortAsc] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [payFor, setPayFor] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("");

  const load = () => {
    api.get("/receivables").then((r) => setRows(r.data));
    onChanged && onChanged();
  };
  useEffect(() => {
    api.get("/receivables").then((r) => setRows(r.data));
    api.get("/clients").then((r) => setClients(r.data)).catch(() => {});
  }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({ client_name: r.client_name, project: r.project || "", total: r.total, received: r.received, due_date: (r.due_date || "").slice(0, 10), method: r.method || "" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.client_name.trim()) return toast.error("O cliente é obrigatório");
    if (!(Number(form.total) > 0)) return toast.error("O valor total deve ser maior que zero");
    const payload = {
      client_name: form.client_name,
      project: form.project,
      total: Number(form.total) || 0,
      received: Number(form.received) || 0,
      due_date: form.due_date,
      method: form.method,
    };
    if (editing) {
      await api.put(`/receivables/${editing.id}`, payload);
      toast.success("Conta atualizada");
    } else {
      await api.post("/receivables", payload);
      toast.success("Conta a receber criada");
    }
    setOpen(false); load();
  };

  const markPaid = async (r) => { await api.post(`/receivables/${r.id}/pay`, { method: r.method || "" }); toast.success("Marcada como paga"); load(); };
  const remove = async (id) => { await api.delete(`/receivables/${id}`); toast.success("Conta removida"); load(); };

  const openPay = (r) => { setPayFor(r); setPayAmount(String(r.balance || "")); setPayMethod(r.method || ""); };
  const savePayment = async () => {
    const amount = Number(payAmount) || 0;
    if (amount <= 0) return toast.error("Indique um valor válido");
    await api.post(`/receivables/${payFor.id}/payment`, { amount, method: payMethod });
    toast.success("Pagamento registado");
    setPayFor(null); load();
  };

  const filtered = rows
    .filter((r) => filter === "todos" || r.status === filter)
    .filter((r) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (r.client_name || "").toLowerCase().includes(q) || (r.project || "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const da = a.due_date || "", db = b.due_date || "";
      return sortAsc ? da.localeCompare(db) : db.localeCompare(da);
    });

  const totalOpen = rows.reduce((s, r) => s + (r.balance || 0), 0);

  return (
    <div className="space-y-4" data-testid="receivables-section">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5 text-emerald-500" />
          <h3 className="font-display text-lg font-medium">Contas a Receber</h3>
          <Badge variant="secondary" className="rounded-full text-xs">{eur(totalOpen)} em aberto</Badge>
        </div>
        <Button data-testid="add-receivable-btn" onClick={openCreate} className="rounded-lg gap-2 hover:-translate-y-0.5 transition-transform">
          <Plus className="h-4 w-4" /> Nova conta
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input data-testid="receivables-search" placeholder="Pesquisar por cliente ou projeto..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger data-testid="receivables-filter" className="h-10 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os estados</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="parcial">Parcial</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" data-testid="receivables-sort" onClick={() => setSortAsc(!sortAsc)} className="h-10 rounded-lg gap-2">
          <ArrowUpDown className="h-4 w-4" /> Vencimento {sortAsc ? "↑" : "↓"}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-16 border-dashed flex flex-col items-center text-center">
          <PiggyBank className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-display text-lg">Sem contas a receber</p>
        </Card>
      ) : (
        <Card className="border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Cliente</TableHead>
                <TableHead>Sessão / Projeto</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Recebido</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const st = statusMap[r.status] || statusMap.pendente;
                const StIcon = st.icon;
                return (
                  <TableRow key={r.id} data-testid={`receivable-row-${r.id}`} className="group">
                    <TableCell className="font-medium">{r.client_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.project || "—"}</TableCell>
                    <TableCell className="text-right font-display font-medium">{eur(r.total)}</TableCell>
                    <TableCell className="text-right text-emerald-500">{eur(r.received)}</TableCell>
                    <TableCell className="text-right font-display font-medium">{eur(r.balance)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.due_date ? fmtDate(r.due_date) : "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.method || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`rounded-full gap-1 text-xs ${st.cls}`}>
                        <StIcon className="h-3 w-3" /> {st.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {r.status !== "pago" && (
                          <>
                            <Button variant="ghost" size="icon" title="Registar pagamento" data-testid={`payment-receivable-${r.id}`} onClick={() => openPay(r)} className="h-8 w-8 text-muted-foreground hover:text-amber-500"><CreditCard className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" title="Marcar como pago" data-testid={`pay-receivable-${r.id}`} onClick={() => markPaid(r)} className="h-8 w-8 text-muted-foreground hover:text-emerald-500"><CheckCircle2 className="h-4 w-4" /></Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" title="Editar" data-testid={`edit-receivable-${r.id}`} onClick={() => openEdit(r)} className="h-8 w-8 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" title="Eliminar" data-testid={`delete-receivable-${r.id}`} onClick={() => remove(r.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display font-medium">{editing ? "Editar conta" : "Nova conta a receber"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Cliente *</Label>
              {clients.length > 0 ? (
                <Select value={form.client_name} onValueChange={(v) => setForm({ ...form, client_name: v })}>
                  <SelectTrigger data-testid="receivable-client-select" className="h-11 mt-1.5"><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input data-testid="receivable-client-input" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="h-11 mt-1.5" />
              )}
            </div>
            <div>
              <Label>Sessão / Projeto</Label>
              <Input data-testid="receivable-project-input" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} className="h-11 mt-1.5" placeholder="Ex: Casamento Quinta dos Sonhos" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Valor total *</Label><Input type="number" data-testid="receivable-total-input" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} className="h-11 mt-1.5" /></div>
              <div><Label>Valor recebido</Label><Input type="number" data-testid="receivable-received-input" value={form.received} onChange={(e) => setForm({ ...form, received: e.target.value })} className="h-11 mt-1.5" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Data de vencimento</Label><Input type="date" data-testid="receivable-due-input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="h-11 mt-1.5" /></div>
              <div>
                <Label>Método de pagamento</Label>
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                  <SelectTrigger data-testid="receivable-method-select" className="h-11 mt-1.5"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button data-testid="save-receivable-btn" onClick={save} className="rounded-lg">Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partial payment dialog */}
      <Dialog open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display font-medium">Registar pagamento</DialogTitle></DialogHeader>
          {payFor && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">{payFor.client_name} · Saldo em aberto: <span className="font-medium text-foreground">{eur(payFor.balance)}</span></p>
              <div><Label>Valor recebido *</Label><Input type="number" data-testid="payment-amount-input" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="h-11 mt-1.5" /></div>
              <div>
                <Label>Método</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger data-testid="payment-method-select" className="h-11 mt-1.5"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter><Button data-testid="save-payment-btn" onClick={savePayment} className="rounded-lg">Registar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
