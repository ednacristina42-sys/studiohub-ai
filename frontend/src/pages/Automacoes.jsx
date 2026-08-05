import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, AlertTriangle, Sparkles, Copy, Check, Loader2, MessageSquare, Mail } from "lucide-react";
import { toast } from "sonner";
import { api, eur, fmtDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function daysUntil(dateStr) {
  if (!dateStr) return 9999;
  const d = new Date(dateStr.slice(0, 10) + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function GeneratedBox({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };
  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
      <div className="whitespace-pre-wrap text-sm text-foreground/90">{text}</div>
      <div className="flex justify-end mt-2">
        <Button size="sm" variant="outline" className="gap-2 rounded-lg" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
    </div>
  );
}

export default function Automacoes() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [channel, setChannel] = useState("whatsapp");
  const [gen, setGen] = useState({});
  const [busy, setBusy] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const [s, r] = await Promise.all([api.get("/sessions"), api.get("/receivables")]);
        setSessions(s.data || []);
        setReceivables(r.data || []);
      } catch (e) {
        toast.error("Não foi possível carregar os dados.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const upcoming = useMemo(
    () =>
      (sessions || [])
        .filter((s) => s.status !== "cancelada" && s.date)
        .map((s) => ({ ...s, _d: daysUntil(s.date) }))
        .filter((s) => s._d >= 0 && s._d <= 7)
        .sort((a, b) => a._d - b._d),
    [sessions]
  );

  const overdue = useMemo(
    () =>
      (receivables || [])
        .filter((r) => r.status === "vencido" && (r.balance || 0) > 0)
        .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || "")),
    [receivables]
  );

  const generate = async (id, kind, client_name, details) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      const res = await api.post("/automations/message", { kind, client_name, details, channel });
      setGen((g) => ({ ...g, [id]: res.data.message }));
    } catch (e) {
      toast.error("Não foi possível gerar a mensagem.");
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-light tracking-tight">Automações</h1>
          <p className="text-muted-foreground mt-1">Lembretes do que precisa de atenção — com mensagem pronta a enviar.</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          <button
            onClick={() => setChannel("whatsapp")}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${channel === "whatsapp" ? "bg-accent text-primary" : "text-muted-foreground"}`}
          >
            <MessageSquare className="h-4 w-4" /> WhatsApp
          </button>
          <button
            onClick={() => setChannel("email")}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${channel === "email" ? "bg-accent text-primary" : "text-muted-foreground"}`}
          >
            <Mail className="h-4 w-4" /> Email
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-light">Próximas sessões (7 dias)</h2>
              <span className="text-xs text-muted-foreground">({upcoming.length})</span>
            </div>
            {upcoming.length === 0 ? (
              <Card className="p-6 text-sm text-muted-foreground border-border">Sem sessões nos próximos 7 dias.</Card>
            ) : (
              <div className="space-y-3">
                {upcoming.map((s) => {
                  const when = s._d === 0 ? "hoje" : s._d === 1 ? "amanhã" : `em ${s._d} dias`;
                  const details = `Sessão: ${s.title} (${s.type || ""}). Data: ${fmtDate(s.date)} ${s.time || ""}. Local: ${s.location || "a combinar"}.`;
                  return (
                    <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="p-4 border-border">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-medium">
                              {s.title} <span className="text-muted-foreground">· {s.client_name || "—"}</span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-0.5">
                              {fmtDate(s.date)} {s.time || ""} · {s.location || "local a combinar"} · {when}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            disabled={busy[s.id]}
                            onClick={() => generate(s.id, "confirmacao_sessao", s.client_name, details)}
                            className="rounded-lg gap-2 shrink-0"
                          >
                            {busy[s.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar confirmação
                          </Button>
                        </div>
                        {gen[s.id] && <GeneratedBox text={gen[s.id]} />}
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-light">Pagamentos em atraso</h2>
              <span className="text-xs text-muted-foreground">({overdue.length})</span>
            </div>
            {overdue.length === 0 ? (
              <Card className="p-6 text-sm text-muted-foreground border-border">Sem pagamentos em atraso. 🎉</Card>
            ) : (
              <div className="space-y-3">
                {overdue.map((r) => {
                  const details = `Valor em atraso: ${eur(r.balance)}${r.project ? ` referente a ${r.project}` : ""}. Vencimento: ${fmtDate(r.due_date)}.`;
                  return (
                    <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="p-4 border-border">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-medium">
                              {r.client_name} <span className="text-destructive font-semibold">· {eur(r.balance)}</span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-0.5">
                              {r.project || "—"} · venceu {fmtDate(r.due_date)}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            disabled={busy[r.id]}
                            onClick={() => generate(r.id, "lembrete_pagamento", r.client_name, details)}
                            className="rounded-lg gap-2 shrink-0"
                          >
                            {busy[r.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar lembrete
                          </Button>
                        </div>
                        {gen[r.id] && <GeneratedBox text={gen[r.id]} />}
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
