import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Aperture, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth, apiErr } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function StudioAuth() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") { await login(form.email, form.password); navigate("/"); }
      else if (mode === "register") { await register(form.name, form.email, form.password); navigate("/"); }
      else {
        await api.post("/auth/forgot-password", { email: form.email });
        toast.success("Se existir uma conta com esse email, enviámos instruções de recuperação.");
        setMode("login");
      }
    } catch (err) {
      toast.error(apiErr(err?.response?.data?.detail) || "Falha na autenticação");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 grain" data-testid="studio-auth-page">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm border border-border rounded-3xl p-8 bg-card shadow-sm">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Aperture className="h-5 w-5" /></div>
          <div className="leading-tight">
            <p className="font-display font-semibold text-lg tracking-tight">StudioHub</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold flex items-center gap-1"><Sparkles className="h-2.5 w-2.5" /> AI</p>
          </div>
        </div>

        <h1 className="font-display text-2xl font-medium mb-1">
          {mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Recuperar acesso"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "login" ? "Bem-vindo de volta ao teu estúdio." : mode === "register" ? "Começa a gerir o teu estúdio." : "Enviamos-te um link de recuperação."}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <div><Label className="text-xs">Nome</Label>
              <Input data-testid="auth-name" value={form.name} onChange={set("name")} placeholder="O teu nome" className="mt-1 rounded-lg" /></div>
          )}
          <div><Label className="text-xs">Email</Label>
            <Input data-testid="auth-email" type="email" required value={form.email} onChange={set("email")} placeholder="tu@estudio.pt" className="mt-1 rounded-lg" /></div>
          {mode !== "forgot" && (
            <div><Label className="text-xs">Palavra-passe</Label>
              <Input data-testid="auth-password" type="password" required value={form.password} onChange={set("password")} placeholder="••••••••" className="mt-1 rounded-lg" /></div>
          )}
          <Button data-testid="auth-submit" type="submit" disabled={loading} className="w-full rounded-lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Enviar link"}
          </Button>
        </form>

        <div className="mt-6 text-sm text-center space-y-2">
          {mode === "login" && (
            <>
              <p className="text-muted-foreground">Sem conta? <button data-testid="switch-register" onClick={() => setMode("register")} className="text-primary hover:underline">Criar conta</button></p>
              <button data-testid="switch-forgot" onClick={() => setMode("forgot")} className="text-xs text-muted-foreground hover:text-foreground">Esqueceste a palavra-passe?</button>
            </>
          )}
          {mode !== "login" && (
            <button data-testid="switch-login" onClick={() => setMode("login")} className="text-primary hover:underline">Voltar a entrar</button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
