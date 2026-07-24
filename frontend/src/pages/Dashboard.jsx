import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Euro, TrendingUp, Users, UserPlus, Camera, CheckCircle2, Clock, CreditCard, Cake,
  Plus, CalendarPlus, ImagePlus, FileSpreadsheet, FileText, ShoppingBag, ArrowUpRight, Bell, Receipt, Activity,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { api, eur, fmtDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
const tip = { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 };

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [activities, setActivities] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setD(r.data)).catch(() => {});
    api.get("/activities?limit=8").then((r) => setActivities(r.data || [])).catch(() => {});
  }, []);

  if (!d) return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>;

  const kpis = [
    { label: "Receita do mês", value: eur(d.revenue_month), icon: Euro, testid: "kpi-revenue-month" },
    { label: "Receita anual", value: eur(d.revenue_year), icon: TrendingUp, testid: "kpi-revenue-year" },
    { label: "Clientes ativos", value: d.active_clients, icon: Users, testid: "kpi-active-clients" },
    { label: "Novos leads", value: d.new_leads, icon: UserPlus, testid: "kpi-leads" },
    { label: "Sessões (7 dias)", value: d.sessions_week, icon: Camera, testid: "kpi-sessions-week" },
    { label: "Galerias entregues", value: d.galleries_delivered, icon: CheckCircle2, testid: "kpi-galleries-delivered" },
    { label: "Galerias pendentes", value: d.galleries_pending, icon: Clock, testid: "kpi-galleries-pending" },
    { label: "Pagamentos pendentes", value: eur(d.pending_payments), icon: CreditCard, testid: "kpi-pending-payments" },
    { label: "Total de vendas", value: eur(d.total_sales), icon: ShoppingBag, testid: "kpi-total-sales" },
    { label: "Pedidos pagos", value: d.paid_orders ?? 0, icon: Receipt, testid: "kpi-paid-orders" },
    { label: "Ticket médio", value: eur(d.avg_ticket), icon: TrendingUp, testid: "kpi-avg-ticket" },
    { label: "Notificações não lidas", value: d.notifications_unread ?? 0, icon: Bell, testid: "kpi-notifications-unread" },
  ];

  const actions = [
    { label: "Novo Cliente", icon: Plus, to: "/clientes" },
    { label: "Nova Sessão", icon: CalendarPlus, to: "/sessoes" },
    { label: "Nova Galeria", icon: ImagePlus, to: "/galerias" },
    { label: "Novo Orçamento", icon: FileSpreadsheet, to: "/orcamentos" },
    { label: "Novo Contrato", icon: FileText, to: "/contratos" },
    { label: "Nova Venda", icon: ShoppingBag, to: "/loja" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Visão geral</p>
          <h2 className="font-display text-3xl md:text-4xl font-light tracking-tight mt-1">Bom trabalho. Aqui está o seu estúdio.</h2>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button key={a.label} variant="outline" data-testid={`action-${a.to.slice(1)}`} onClick={() => navigate(a.to)}
            className="rounded-full gap-2 hover:-translate-y-0.5 transition-transform">
            <a.icon className="h-4 w-4 text-primary" /> {a.label}
          </Button>
        ))}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card data-testid={c.testid} className="p-5 border-border hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                  <p className="font-display text-2xl font-medium mt-2 tracking-tight">{c.value}</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-primary shrink-0"><c.icon className="h-4.5 w-4.5" /></div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2 border-border">
          <h3 className="font-display text-lg font-medium mb-6 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Receita mensal</h3>
          <div className="h-64" style={{ minHeight: 256 }}>
            {d.revenue_chart.length === 0 ? <Empty text="Sem faturas pagas ainda" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.revenue_chart}>
                  <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tip} formatter={(v) => [eur(v), "Receita"]} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-6 border-border">
          <h3 className="font-display text-lg font-medium mb-6 flex items-center gap-2"><Camera className="h-4 w-4 text-primary" /> Sessões por mês</h3>
          <div className="h-64" style={{ minHeight: 256 }}>
            {d.sessions_chart.length === 0 ? <Empty text="Sem sessões" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.sessions_chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tip} formatter={(v) => [v, "Sessões"]} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-border">
          <h3 className="font-display text-lg font-medium mb-4">Vendas por serviço</h3>
          <div className="h-56" style={{ minHeight: 224 }}>
            {d.sales_by_service.length === 0 ? <Empty text="Sem dados" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.sales_by_service} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {d.sales_by_service.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tip} formatter={(v) => eur(v)} />
                  <Legend formatter={(v) => <span className="text-xs capitalize text-muted-foreground">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-6 border-border">
          <h3 className="font-display text-lg font-medium mb-4">Origem dos clientes</h3>
          <div className="h-56" style={{ minHeight: 224 }}>
            {d.client_origins.length === 0 ? <Empty text="Sem dados" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.client_origins} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={90} className="capitalize" />
                  <Tooltip contentStyle={tip} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                  <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 6, 6, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Upcoming + birthdays */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 border-border lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-medium flex items-center gap-2"><Camera className="h-4 w-4 text-primary" /> Próximas sessões</h3>
            <button onClick={() => navigate("/sessoes")} className="text-sm text-primary flex items-center gap-1 hover:gap-2 transition-all" data-testid="view-sessions-link">Ver todas <ArrowUpRight className="h-3.5 w-3.5" /></button>
          </div>
          {d.upcoming_sessions.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma sessão agendada.</p> : (
            <div className="divide-y divide-border">
              {d.upcoming_sessions.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-3">
                  <div><p className="font-medium text-sm">{e.title}</p><p className="text-xs text-muted-foreground capitalize">{e.client_name} · {e.type}</p></div>
                  <div className="text-right"><p className="text-sm font-medium">{fmtDate(e.date)}</p><p className="text-xs text-muted-foreground">{e.time || "—"}</p></div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 border-border">
          <h3 className="font-display text-lg font-medium mb-4 flex items-center gap-2"><Cake className="h-4 w-4 text-primary" /> Próximos aniversários</h3>
          {d.birthdays.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Sem aniversários próximos.</p> : (
            <div className="space-y-3">
              {d.birthdays.map((b) => (
                <div key={b.name} className="flex items-center gap-3">
                  <Avatar className="h-9 w-9"><AvatarImage src={b.photo} /><AvatarFallback>{b.name.charAt(0)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{b.name}</p><p className="text-xs text-muted-foreground">{fmtDate(b.date)}</p></div>
                  <Badge variant="secondary" className="rounded-full text-xs">{b.days === 0 ? "Hoje" : `${b.days}d`}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Atividade recente (CRM) */}
      <Card className="p-6 border-border" data-testid="recent-activity-card">
        <h3 className="font-display text-lg font-medium mb-4 flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Atividade recente</h3>
        {activities.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Sem atividade recente.</p> : (
          <div className="divide-y divide-border">
            {activities.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2.5" data-testid={`activity-${a.id}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  <p className="text-sm truncate">{a.message}{a.client_name ? <span className="text-muted-foreground"> · {a.client_name}</span> : null}</p>
                </div>
                <p className="text-xs text-muted-foreground shrink-0 ml-3">{fmtDate(a.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

const Empty = ({ text }) => <div className="h-full flex items-center justify-center text-sm text-muted-foreground">{text}</div>;
