import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Loader2, User } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const SUGGESTIONS = [
  "Cria um orçamento para uma sessão de casamento",
  "Mostra clientes que ainda não pagaram",
  "Escreve um email de follow-up para um lead",
  "Cria uma campanha para Instagram",
];

export const AiChat = ({ compact = false }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const sessionRef = useRef("");
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const r = await api.post("/ai/chat", { message: msg, session_id: sessionRef.current });
      sessionRef.current = r.data.session_id;
      setMessages((m) => [...m, { role: "assistant", content: r.data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Desculpe, o assistente não está disponível de momento." }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto space-y-4 p-1">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-accent flex items-center justify-center text-primary ai-glow mb-3"><Sparkles className="h-6 w-6" /></div>
            <p className="font-display text-base font-medium">Assistente StudioHub</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Peça orçamentos, emails, campanhas ou consultas ao seu negócio.</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} data-testid="ai-suggestion" onClick={() => send(s)}
                  className="text-left text-xs rounded-lg border border-border px-3 py-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-secondary" : "bg-primary text-primary-foreground"}`}>
              {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            </div>
            <div className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>{m.content}</div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Sparkles className="h-3.5 w-3.5" /></div>
            <div className="rounded-xl px-3.5 py-2.5 bg-secondary"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="pt-3 border-t border-border flex gap-2 items-end">
        <Textarea data-testid="ai-input" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Escreva uma mensagem..." className="min-h-[44px] max-h-32 resize-none" />
        <Button data-testid="ai-send-btn" onClick={() => send()} disabled={loading} size="icon" className="h-11 w-11 rounded-lg shrink-0"><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
};

export default AiChat;
