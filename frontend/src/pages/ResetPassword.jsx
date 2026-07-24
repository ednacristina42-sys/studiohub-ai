import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Aperture, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { apiErr } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!token) return toast.error("Link inválido");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Palavra-passe atualizada. Já podes entrar.");
      navigate("/login");
    } catch (err) {
      toast.error(apiErr(err?.response?.data?.detail) || "Não foi possível redefinir");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 grain" data-testid="reset-password-page">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm border border-border rounded-3xl p-8 bg-card shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-6"><Aperture className="h-5 w-5" /></div>
        <h1 className="font-display text-2xl font-medium mb-1">Nova palavra-passe</h1>
        <p className="text-sm text-muted-foreground mb-6">Define a tua nova palavra-passe.</p>
        <form onSubmit={submit} className="space-y-4">
          <div><Label className="text-xs">Palavra-passe</Label>
            <Input data-testid="reset-password-input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1 rounded-lg" /></div>
          <Button data-testid="reset-submit" type="submit" disabled={loading} className="w-full rounded-lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redefinir"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
