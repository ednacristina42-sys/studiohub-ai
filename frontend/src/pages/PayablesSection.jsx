import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, CheckCircle2, Clock, AlertTriangle, Ban, Search, ArrowUpDown, Landmark } from "lucide-react";
import { toast } from "sonner";
import { api, eur, fmtDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  "Equipamentos", "Marketing", "Publicidade", "Transporte", "Combustível",
  "Alimentação", "Freelancers", "Fotógrafos", "Designers", "Impressões",
  "Álbuns", "Fornecedores", "Software", "Assinaturas", "Impostos", "Outros",
];
const METHODS = ["Transferência", "MB Way", "Multibanco", "Dinheiro", "Cartão", "Cheque"];

const statusMap = {
  pendente: { label: "Pendente", cls: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: Clock },
  pago: { label: "Pago", cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2 },
  vencido: { label: "Vencido", cls: "bg-rose-500/10 text-rose-500 border-rose-500/20", icon: AlertTriangle },
  cancelado: { label: "Cancelado", cls: "bg-muted text-muted-foreground border-border", icon: Ban },
};

const emptyForm = { supplier: "", description: "", category: "Outros", amount: "", due_date: "", method: "", status: "pendente", notes: "" };

export default function PayablesSection({ onChanged }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const [catFilter, setCatFilter] = useState("todas");
  const [sortAsc, setSortAsc] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    api.get("/payables").then((r) => setRows(r.data));
    onChanged && onChanged();
  };
  useEffect(() => { api.get("/payables").then((r) => setRows(r.data)); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      supplier: p.supplier || "", description: p.description || "", category: p.category || "Outros",
      amount: p.amount, due_date: (p.due_date || "").slice(0, 10), method: p.method || "",
      status: p.status === "vencido" ? "pendente" : p.status, notes: p.notes || "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.supplier.trim() && !form.description.trim()) return toast.error("Indique o fornecedor ou a descrição");
    if (!(Number(form.amount) >= 0)) return toast.error("O valor não pode ser negativo");
    const payload = {
      supplier: form.supplier, description: form.description, category: form.category,
      amount: Number(form.amount) || 0, due_date: form.due_date, method: form.method,
      status: form.status, notes: form.notes,
    };
    if (editing) {
      await api.put(`/payables/${editing.id}`, payload);
      toast.success("Conta atualizada");
    } else {
      await api.post("/payables", payload);
      toast.success("Conta a pagar criada");
    }
    setOpen(false); load();
  };

  const markPaid = async (p) => { await api.post(`/payables/${p.id}/pay`, { method: p.method || "" }); toast.success("Marcada como paga"); load(); };
  const remove = async (id) => { await api.delete(`/payables/${id}`); toast.success("Conta removida"); load(); };

  const filtered = rows
    .filter((p) => filter === "todos" || p.status === filter)
    .filter((p) => catFilter === "todas" || p.category === catFilter)
    .filter((p) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (p.supplier || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const da = a.due_date || "", db = b.due_date || "";
      return sortAsc ? da.localeCompare(db) : db.localeCompare(da);
    });

  const totalOpen = rows.filter((p) => p.status === "pendente" || p.status === "vencido").reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="space-y-4" data-testid="payables-section">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-rose-500" />
          <h3 className="font-display text-lg font-medium">Contas a Pagar</h3>
          <Badge variant="secondary" className="rounded-full text-xs">{eur(totalOpen)} em aberto</Badge>
        </div>
        <Button data-testid="add-payable-btn" onClick={openCreate} className="rounded-lg gap-2 hover:-translate-y-0.5 transition-transform">
          <Plus className="h-4 w-4" /> Nova conta
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input data-testid="payables-search" placeholder="Pesquisar por fornecedor, descrição ou categoria..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger data-testid="payables-filter" className="h-10 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os estados</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger data-testid="payables-category-filter" className="h-10 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" data-testid="payables-sort" onClick={() => setSortAsc(!sortAsc)} className="h-10 rounded-lg gap-2">
          <ArrowUpDown className="h-4 w-4" /> Vencimento {sortAsc ? "↑" : "↓"}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-16 border-dashed flex flex-col items-center text-center">
          <Landmark className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-display text-lg">Sem contas a pagar</p>
        </Card>
      ) : (
        <Card className="border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Fornecedor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const st = statusMap[p.status] || statusMap.pendente;
                const StIcon = st.icon;
                return (
                  <TableRow key={p.id} data-testid={`payable-row-${p.id}`} className="group">
                    <TableCell className="font-medium">{p.supplier || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.description || "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className="rounded-full text-xs font-normal">{p.category}</Badge></TableCell>
                    <TableCell className="text-right font-display font-medium">{eur(p.amount)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.due_date ? fmtDate(p.due_date) : "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.method || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`rounded-full gap-1 text-xs ${st.cls}`}>
                        <StIcon className="h-3 w-3" /> {st.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {p.status !== "pago" && p.status !== "cancelado" && (
                          <Button variant="ghost" size="icon" title="Marcar como paga" data-testid={`pay-payable-${p.id}`} onClick={() => markPaid(p)} className="h-8 w-8 text-muted-foreground hover:text-emerald-500"><CheckCircle2 className="h-4 w-4" /></Button>
                        )}
                        <Button variant="ghost" size="icon" title="Editar" data-testid={`edit-payable-${p.id}`} onClick={() => openEdit(p)} className="h-8 w-8 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" title="Eliminar" data-testid={`delete-payable-${p.id}`} onClick={() => remove(p.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle className="font-display font-medium">{editing ? "Editar conta a pagar" : "Nova conta a pagar"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Fornecedor</Label><Input data-testid="payable-supplier-input" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="h-11 mt-1.5" /></div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger data-testid="payable-category-select" className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Descrição</Label><Input data-testid="payable-description-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-11 mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Valor *</Label><Input type="number" min="0" data-testid="payable-amount-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="h-11 mt-1.5" /></div>
              <div><Label>Data de vencimento</Label><Input type="date" data-testid="payable-due-input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="h-11 mt-1.5" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Método de pagamento</Label>
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                  <SelectTrigger data-testid="payable-method-select" className="h-11 mt-1.5"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger data-testid="payable-status-select" className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Observações</Label><Textarea data-testid="payable-notes-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5" rows={2} /></div>
          </div>
          <DialogFooter><Button data-testid="save-payable-btn" onClick={save} className="rounded-lg">Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
