import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, FileSpreadsheet, TrendingUp, PieChart as PieIcon, Wallet, Users } from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { api, eur } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
const tip = { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 };

const STATUS_OPTS = [
  { value: "todos", label: "Todos os estados" },
  { value: "pendente", label: "Pendente" },
  { value: "parcial", label: "Parcial" },
  { value: "pago", label: "Pago" },
  { value: "vencido", label: "Vencido" },
  { value: "cancelado", label: "Cancelado" },
];
const CATEGORIES = ["Equipamentos", "Marketing", "Publicidade", "Transporte", "Combustível", "Alimentação", "Freelancers", "Fotógrafos", "Designers", "Impressões", "Álbuns", "Fornecedores", "Software", "Assinaturas", "Impostos", "Outros"];
const LABELS = { paga: "Paga", pendente: "Pendente", cancelada: "Cancelada", parcial: "Parcial", pago: "Pago", vencido: "Vencido", cancelado: "Cancelado" };

const ChartCard = ({ title, icon: Icon, children, testid }) => (
  <Card className="p-6 border-border" data-testid={testid}>
    <div className="flex items-center gap-2 mb-4"><Icon className="h-4 w-4 text-primary" /><h3 className="font-display text-lg font-medium">{title}</h3></div>
    <div className="h-64" style={{ minHeight: 256 }}>{children}</div>
  </Card>
);

const Empty = () => <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados no período</div>;

export default function Reports() {
  const [data, setData] = useState(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [status, setStatus] = useState("todos");
  const [category, setCategory] = useState("todas");
  const [exporting, setExporting] = useState("");

  const params = () => {
    const p = {};
    if (start) p.start = start;
    if (end) p.end = end;
    if (status !== "todos") p.status = status;
    if (category !== "todas") p.category = category;
    return p;
  };

  const load = () => api.get("/reports/financial", { params: params() }).then((r) => setData(r.data));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [start, end, status, category]);

  const exportFile = async (format) => {
    setExporting(format);
    try {
      const res = await api.get("/reports/financial/export", { params: { ...params(), format }, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-financeiro.${format === "xlsx" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Relatório ${format.toUpperCase()} exportado`);
    } catch {
      toast.error("Falha ao exportar");
    } finally { setExporting(""); }
  };

  const clearFilters = () => { setStart(""); setEnd(""); setStatus("todos"); setCategory("todas"); };

  const recvData = (data?.receivables_by_status || []).map((r) => ({ ...r, label: LABELS[r.name] || r.name }));
  const payData = (data?.payables_by_status || []).map((r) => ({ ...r, label: LABELS[r.name] || r.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link to="/financeiro" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="reports-back-link">
          <ArrowLeft className="h-4 w-4" /> Voltar ao Financeiro
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="export-pdf-btn" disabled={exporting === "pdf"} onClick={() => exportFile("pdf")} className="rounded-lg gap-2">
            <FileText className="h-4 w-4" /> {exporting === "pdf" ? "A exportar..." : "PDF"}
          </Button>
          <Button variant="outline" data-testid="export-excel-btn" disabled={exporting === "xlsx"} onClick={() => exportFile("xlsx")} className="rounded-lg gap-2">
            <FileSpreadsheet className="h-4 w-4" /> {exporting === "xlsx" ? "A exportar..." : "Excel"}
          </Button>
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl font-medium">Relatórios Financeiros</h2>
        <p className="text-sm text-muted-foreground mt-1">Análise de receitas, despesas, fluxo de caixa e clientes.</p>
      </div>

      {/* Filtros */}
      <Card className="p-5 border-border" data-testid="reports-filters">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div><Label className="text-xs">Início</Label><Input type="date" data-testid="filter-start" value={start} onChange={(e) => setStart(e.target.value)} className="h-10 mt-1.5" /></div>
          <div><Label className="text-xs">Fim</Label><Input type="date" data-testid="filter-end" value={end} onChange={(e) => setEnd(e.target.value)} className="h-10 mt-1.5" /></div>
          <div>
            <Label className="text-xs">Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="filter-status" className="h-10 mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="filter-category" className="h-10 mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" data-testid="clear-filters-btn" onClick={clearFilters} className="h-10 rounded-lg">Limpar filtros</Button>
        </div>
      </Card>

      {/* Totais fluxo de caixa */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { key: "inflow", label: "Entradas", cls: "text-emerald-500" },
          { key: "outflow", label: "Saídas", cls: "text-rose-500" },
          { key: "net", label: "Líquido", cls: "text-primary" },
        ].map((t, i) => (
          <motion.div key={t.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card data-testid={`cashflow-total-${t.key}`} className="p-5 border-border flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">{t.label}</p><p className="font-display text-xl font-medium mt-1">{data ? eur(data.totals[t.key]) : "—"}</p></div>
              <Wallet className={`h-5 w-5 ${t.cls}`} />
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Receita por mês" icon={TrendingUp} testid="report-revenue">
          {!data || data.revenue_by_month.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenue_by_month}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tip} formatter={(v) => [eur(v), "Receita"]} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Despesas por categoria" icon={PieIcon} testid="report-expenses">
          {!data || data.expenses_by_category.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.expenses_by_category} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {data.expenses_by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tip} formatter={(v) => eur(v)} />
                <Legend formatter={(v) => <span className="text-xs capitalize text-muted-foreground">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Contas a receber por estado" icon={PieIcon} testid="report-receivables">
          {!data || recvData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recvData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tip} formatter={(v, n) => [n === "value" ? eur(v) : v, n === "value" ? "Saldo" : "Nº"]} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Contas a pagar por estado" icon={PieIcon} testid="report-payables">
          {!data || payData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tip} formatter={(v, n) => [n === "value" ? eur(v) : v, n === "value" ? "Valor" : "Nº"]} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                <Bar dataKey="value" fill="hsl(var(--chart-4))" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Fluxo de caixa (entradas vs saídas)" icon={Wallet} testid="report-cashflow">
          {!data || data.cashflow.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.cashflow}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tip} formatter={(v, n) => [eur(v), n === "inflow" ? "Entradas" : "Saídas"]} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                <Legend formatter={(v) => <span className="text-xs text-muted-foreground">{v === "inflow" ? "Entradas" : "Saídas"}</span>} />
                <Bar dataKey="inflow" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} maxBarSize={26} />
                <Bar dataKey="outflow" fill="hsl(var(--chart-5))" radius={[6, 6, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Top 10 clientes por faturação" icon={Users} testid="report-top-clients">
          {!data || data.top_clients.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.top_clients} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={120} />
                <Tooltip contentStyle={tip} formatter={(v) => [eur(v), "Faturação"]} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={[0, 6, 6, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
