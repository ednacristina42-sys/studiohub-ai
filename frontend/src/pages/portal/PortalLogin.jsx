import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Aperture, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { usePortalAuth, portalApi } from "@/lib/portalAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PortalLogin() {
  const { login } = usePortalAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");

  const submit = async () => {
    if (!email || !password) return toast.error("Preencha email e palavra-passe");
    setLoading(true);
    try { await login(email, password); navigate("/portal"); }
    catch (e) { toast.error(e?.response?.data?.detail || "Credenciais inválidas"); }
    finally { setLoading(false); }
  };
  const recover = async () => {
    if (!email) return toast.error("Introduza o seu email");
    await portalApi.post("/portal/auth/forgot-password", { email });
    toast.success("Se o email existir, enviámos instruções de recuperação.");
    setMode("login");
  };

  return (
    <div className="min-h-screen bg-background grain flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"><Aperture className="h-6 w-6" /></div>
          <div><p className="font-display font-semibold text-lg leading-tight">StudioHub</p><p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">Área do Cliente</p></div>
        </div>
        <Card className="p-8 border-border">
          {mode === "login" ? (
            <>
              <h1 className="font-display text-2xl font-light tracking-tight">Bem-vindo de volta</h1>
              <p className="text-sm text-muted-foreground mt-1 mb-6">Aceda às suas galerias, sessões e documentos.</p>
              <div className="space-y-4">
                <div><Label>Email</Label><Input data-testid="portal-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 mt-1.5" placeholder="o.seu@email.com" /></div>
                <div><Label>Palavra-passe</Label><Input data-testid="portal-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} className="h-11 mt-1.5" placeholder="••••••••" /></div>
                <Button data-testid="portal-login-btn" onClick={submit} disabled={loading} className="w-full h-11 rounded-lg gap-2">{loading && <Loader2 className="h-4 w-4 animate-spin" />} Entrar</Button>
                <button data-testid="portal-forgot-link" onClick={() => setMode("recover")} className="text-sm text-muted-foreground hover:text-primary transition-colors w-full text-center">Esqueceu-se da palavra-passe?</button>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-light tracking-tight">Recuperar acesso</h1>
              <p className="text-sm text-muted-foreground mt-1 mb-6">Introduza o seu email para receber instruções.</p>
              <div className="space-y-4">
                <div><Label>Email</Label><Input data-testid="portal-recover-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 mt-1.5" /></div>
                <Button data-testid="portal-recover-btn" onClick={recover} className="w-full h-11 rounded-lg">Enviar instruções</Button>
                <button onClick={() => setMode("login")} className="text-sm text-muted-foreground hover:text-primary transition-colors w-full text-center flex items-center justify-center gap-1"><ArrowLeft className="h-3.5 w-3.5" /> Voltar</button>
              </div>
            </>
          )}
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-4">Demo: ana.rui@email.pt / cliente123</p>
      </motion.div>
    </div>
  );
}
