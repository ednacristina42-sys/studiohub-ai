import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, User, Copy, Check, Plus, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const AssistantChat = ({ assistant, Icon, accent = "text-primary", actions = [], placeholder }) => {
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(-1);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const loadConversations = useCallback(async () => {
    try {
      const r = await api.get(`/ai/conversations`, { params: { assistant } });
      setConversations(r.data || []);
    } catch { /* silencioso */ }
  }, [assistant]);

  // Ao trocar de assistente: reinicia estado e recarrega histórico
  useEffect(() => {
    setConversationId(""); setMessages([]); setInput("");
    loadConversations();
  }, [assistant, loadConversations]);

  const newConversation = () => { setConversationId(""); setMessages([]); setInput(""); };

  const openConversation = async (id) => {
    if (loading) return;
    try {
      const r = await api.get(`/ai/conversations/${id}`);
      setConversationId(id);
      setMessages((r.data.messages || []).map((m) => ({ role: m.role, content: m.content })));
    } catch { toast.error("Não foi possível abrir a conversa"); }
  };

  const removeConversation = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/ai/conversations/${id}`);
      setConversations((c) => c.filter((x) => x.id !== id));
      if (id === conversationId) newConversation();
      toast.success("Conversa apagada");
    } catch { toast.error("Não foi possível apagar"); }
  };

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setLoading(true);
    try {
      let reply;
      if (conversationId) {
        const r = await api.post(`/ai/conversations/${conversationId}/message`, { message: msg });
        reply = r.data.reply;
      } else {
        const r = await api.post(`/ai/assistant`, { assistant, message: msg });
        setConversationId(r.data.conversation_id);
        reply = r.data.reply;
      }
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      loadConversations();
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Desculpe, o assistente não está disponível de momento." }]);
    } finally { setLoading(false); }
  };

  const copy = async (t, i) => {
    try {
      await navigator.clipboard.writeText(t);
      setCopied(i); setTimeout(() => setCopied(-1), 1500);
      toast.success("Copiado para a área de transferência");
    } catch { toast.error("Não foi possível copiar"); }
  };

  return (
    <div className="flex flex-col md:flex-row h-full min-h-0 gap-4" data-testid={`assistant-chat-${assistant}`}>
      {/* Sidebar — conversas anteriores */}
      <div className="md:w-60 shrink-0 flex flex-col md:border-r border-border md:pr-4">
        <Button data-testid="assistant-new-conversation" onClick={newConversation} variant="outline"
          className="w-full justify-start gap-2 mb-3">
          <Plus className="h-4 w-4" /> Nova conversa
        </Button>
        <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-2 px-1">Conversas anteriores</p>
        <div className="flex-1 overflow-y-auto space-y-1 max-h-40 md:max-h-none">
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground px-1 py-2">Ainda não há conversas guardadas.</p>
          )}
          {conversations.map((c) => (
            <div key={c.id} data-testid="conversation-item" onClick={() => openConversation(c.id)}
              className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors ${c.id === conversationId ? "bg-accent text-foreground" : "hover:bg-secondary text-muted-foreground"}`}>
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate text-xs">{c.title}</span>
              <button data-testid="conversation-delete" onClick={(e) => removeConversation(c.id, e)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto space-y-4 p-1">
          {messages.length === 0 && (
            <div className="py-4">
              <div className={`mx-auto h-12 w-12 rounded-2xl bg-accent flex items-center justify-center ${accent} ai-glow mb-3`}>
                <Icon className="h-6 w-6" />
              </div>
              <p className="text-center text-xs text-muted-foreground mb-4">Escolha uma ação rápida ou escreva o seu pedido.</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {actions.map((a) => (
                  <button key={a} data-testid="assistant-action" onClick={() => send(a)}
                    className="text-left text-xs rounded-lg border border-border px-3 py-2.5 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-accent/40 transition-colors">
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-secondary" : "bg-primary text-primary-foreground"}`}>
                {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <div className={`group relative rounded-xl px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                {m.content}
                {m.role === "assistant" && (
                  <button data-testid="assistant-copy" onClick={() => copy(m.content, i)}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-md bg-card border border-border flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground">
                    {copied === i ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Icon className="h-3.5 w-3.5" /></div>
              <div className="rounded-xl px-3.5 py-2.5 bg-secondary"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="pt-3 border-t border-border flex gap-2 items-end">
          <Textarea data-testid="assistant-input" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={placeholder || "Escreva o seu pedido..."} className="min-h-[44px] max-h-32 resize-none" />
          <Button data-testid="assistant-send-btn" onClick={() => send()} disabled={loading} size="icon" className="h-11 w-11 rounded-lg shrink-0"><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
};

export default AssistantChat;
