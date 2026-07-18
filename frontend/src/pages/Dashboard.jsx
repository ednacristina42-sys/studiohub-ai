import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Users, FolderKanban, Images, Euro, TrendingUp, CalendarClock, ArrowUpRight, Clock,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import { api, eur, fmtDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const stat = (label, value, icon, testid, sub) => ({ label, value, icon, testid, sub });

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  const cards = [
    stat("Clientes", data.clients, Users, "stat-clients"),
    stat("Projetos ativos", data.active_projects, FolderKanban, "stat-projects", `${data.projects} no total`),
    stat("Galerias", data.galleries, Images, "stat-galleries"),
    stat("Receita", eur(data.revenue), Euro, "stat-revenue", `${eur(data.pending)} pendente`),
  ];

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Bem-vindo de volta</p>
        <h2 className="font-display text-3xl md:text-4xl font-light tracking-tight mt-1">O seu estúdio, num só lugar.</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card data-testid={c.testid} className="p-6 border-border hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="font-display text-3xl font-medium mt-2 tracking-tight">{c.value}</p>
                  {c.sub && <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>}
                </div>
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-primary">
                  <c.icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2 border-border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="font-display text-lg font-medium">Receita</h3>
            </div>
            <Badge variant="secondary" className="rounded-full">Últimos meses</Badge>
          </div>
          <div className="h-64">
            {data.revenue_chart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem faturas pagas ainda</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenue_chart}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 }}
                    formatter={(v) => [eur(v), "Receita"]}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-6 border-border">
          <h3 className="font-display text-lg font-medium mb-6">Projetos por estado</h3>
          <div className="h-48">
            {data.project_status.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem projetos</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.project_status} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {data.project_status.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="space-y-2 mt-2">
            {data.project_status.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 capitalize text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {p.name.replace("_", " ")}
                </span>
                <span className="font-medium">{p.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6 border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            <h3 className="font-display text-lg font-medium">Próximas sessões</h3>
          </div>
          <Link to="/calendario" className="text-sm text-primary flex items-center gap-1 hover:gap-2 transition-all" data-testid="view-calendar-link">
            Ver calendário <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {data.upcoming_events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma sessão agendada.</p>
        ) : (
          <div className="divide-y divide-border">
            {data.upcoming_events.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.client_name} · {e.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{fmtDate(e.date)}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><Clock className="h-3 w-3" />{e.time || "—"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
