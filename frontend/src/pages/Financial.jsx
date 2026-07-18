import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Receipt, Euro, Clock, CheckCircle2, X, Wallet, ArrowDownCircle, TrendingUp, Landmark } from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { api, eur, fmtDate } from "@/lib/api";
import { useSettings } from "@/lib/settings";
import ReceivablesSection from "./ReceivablesSection";
import PayablesSection from "./PayablesSection";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const statusMap = {
  paga: { label: "Paga", cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2 },
  pendente: { label: "Pendente", cls: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Clock },
  cancelada: { label: "Cancelada", cls: "bg-rose-500/10 text-rose-500 border-rose-500/20", icon: X },
};

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
const tip = { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 };

export default function Financial() {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ client_name: "", type: "fatura", due_date: "", tax_rate: 23 });
  const [items, setItems] = useState([{ description: "", quantity: 1, price: 0 }]);
  const { settings } = useSettings();

  const load = () => {
    api.get("/invoices").then((r) => setInvoices(r.data));
    api.get("/finance/summary").then((r) => setSummary(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const total = (its, tax) => {
    const sub = its.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);
    return sub + sub * (Number(tax) || 0) / 100;
  };

  const save = async () => {
    if (!form.client_name.trim()) return toast.error("O cliente é obrigatório");
    const clean = items.filter((i) => i.description.trim()).map((i) => ({ description: i.description, quantity: Number(i.quantity) || 1, price: Number(i.price) || 0 }));
    if (clean.length === 0) return toast.error("Adicione pelo menos um item");
    await api.post("/invoices", { ...form, tax_rate: Number(form.tax_rate) || 0, items: clean });
    toast.success("Fatura criada");
    setOpen(false); setForm({ client_name: "", type: "fatura", due_date: "", tax_rate: 23 }); setItems([{ description: "", quantity: 1, price: 0 }]); load();
  };

  const setStatus = async (id, status) => { await api.put(`/invoices/${id}/status`, { status }); toast.success("Estado atualizado"); load(); };
  const remove = async (id) => { await api.delete(`/invoices/${id}`); toast.success("Fatura removida"); load(); };

  const updateItem = (idx, key, val) => setItems(items.map((it, i) => i === idx ? { ...it, [key]: val } : it));

  const kpis = [
    { key: "revenue_month", label: "Receita do mês", value: summary ? eur(summary.revenue_month) : "—", icon: Euro, cls: "text-emerald-500" },
    { key: "receivable", label: "Contas a receber", value: summary ? eur(summary.receivable) : "—", icon: Clock, cls: "text-amber-500" },
    { key: "payable", label: "Contas a pagar", value: summary ? eur(summary.payable) : "—", icon: ArrowDownCircle, cls: "text-rose-500" },
    { key: "profit", label: "Lucro", value: summary ? eur(summary.profit) : "—", icon: TrendingUp, cls: "text-primary" },
    { key: "cashflow", label: "Fluxo de caixa", value: summary ? eur(summary.cashflow) : "—", icon: Wallet, cls: "text-sky-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((s, i) => (
          <motion.div key={s.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card data-testid={`kpi-${s.key}`} className="p-5 border-border flex items-center justify-between h-full">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="font-display text-xl font-medium mt-1">{s.value}</p>
              </div>
              <s.icon className={`h-5 w-5 shrink-0 ${s.cls}`} />
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="revenue-chart" className="p-6 border-border">
          <h3 className="font-display text-lg font-medium mb-4">Receita mensal</h3>
          <div className="h-64" style={{ minHeight: 256 }}>
            {!summary || summary.revenue_chart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.revenue_chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tip} formatter={(v) => [eur(v), "Receita"]} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card data-testid="expenses-chart" className="p-6 border-border">
          <h3 className="font-display text-lg font-medium mb-4">Despesas por categoria</h3>
          <div className="h-64" style={{ minHeight: 256 }}>
            {!summary || summary.expenses_by_category.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary.expenses_by_category} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {summary.expenses_by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tip} formatter={(v) => eur(v)} />
                  <Legend formatter={(v) => <span className="text-xs capitalize text-muted-foreground">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-medium">Faturas & Orçamentos</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-invoice-btn" className="rounded-lg gap-2 hover:-translate-y-0.5 transition-transform"><Plus className="h-4 w-4" /> Nova fatura</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader><DialogTitle className="font-display font-medium">Nova fatura</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Cliente *</Label><Input data-testid="invoice-client-input" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="h-11 mt-1.5" /></div>
                <div><Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="fatura">Fatura</SelectItem><SelectItem value="orcamento">Orçamento</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Vencimento</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="h-11 mt-1.5" /></div>
              </div>
              <div>
                <Label>Itens</Label>
                <div className="space-y-2 mt-1.5">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input placeholder="Descrição" data-testid={`item-desc-${idx}`} value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} className="h-10 flex-1" />
                      <Input type="number" placeholder="Qtd" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} className="h-10 w-16" />
                      <Input type="number" placeholder="€" value={it.price} onChange={(e) => updateItem(idx, "price", e.target.value)} className="h-10 w-24" />
                      {items.length > 1 && <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="h-10 w-10 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></Button>}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" data-testid="add-item-btn" onClick={() => setItems([...items, { description: "", quantity: 1, price: 0 }])} className="rounded-lg gap-1"><Plus className="h-3.5 w-3.5" /> Item</Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Label>{settings.tax_label || "IVA"} %</Label><Input type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} className="h-10 w-20" /></div>
                <p className="font-display text-xl font-medium">{eur(total(items, form.tax_rate))}</p>
              </div>
            </div>
            <DialogFooter><Button data-testid="save-invoice-btn" onClick={save} className="rounded-lg">Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {invoices.length === 0 ? (
        <Card className="p-16 border-dashed flex flex-col items-center text-center"><Receipt className="h-10 w-10 text-muted-foreground mb-3" /><p className="font-display text-lg">Sem faturas</p></Card>
      ) : (
        <Card className="border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Número</TableHead><TableHead>Cliente</TableHead><TableHead>Emissão</TableHead>
                <TableHead>Total</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const st = statusMap[inv.status] || statusMap.pendente;
                return (
                  <TableRow key={inv.id} data-testid={`invoice-row-${inv.id}`} className="group">
                    <TableCell className="font-mono text-sm">{inv.number}<Badge variant="secondary" className="ml-2 rounded-full text-[10px] capitalize">{inv.type}</Badge></TableCell>
                    <TableCell className="font-medium">{inv.client_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{fmtDate(inv.issue_date)}</TableCell>
                    <TableCell className="font-display font-medium">{eur(inv.total)}</TableCell>
                    <TableCell>
                      <Select value={inv.status} onValueChange={(v) => setStatus(inv.id, v)}>
                        <SelectTrigger data-testid={`invoice-status-${inv.id}`} className={`h-8 w-32 rounded-full border text-xs ${st.cls}`}><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="paga">Paga</SelectItem><SelectItem value="cancelada">Cancelada</SelectItem></SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" data-testid={`delete-invoice-${inv.id}`} onClick={() => remove(inv.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <div className="pt-2 border-t border-border/60">
        <ReceivablesSection onChanged={() => api.get("/finance/summary").then((r) => setSummary(r.data)).catch(() => {})} />
      </div>

      <div className="pt-2 border-t border-border/60">
        <PayablesSection onChanged={() => api.get("/finance/summary").then((r) => setSummary(r.data)).catch(() => {})} />
      </div>
    </div>
  );
}
