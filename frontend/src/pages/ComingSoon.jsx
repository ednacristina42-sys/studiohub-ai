import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ComingSoon({ title, desc }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <Card className="p-10 border-border text-center relative overflow-hidden">
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-accent flex items-center justify-center text-primary mb-5 ai-glow">
              <Sparkles className="h-7 w-7" />
            </div>
            <span className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Em breve</span>
            <h2 className="font-display text-3xl font-light tracking-tight mt-2">{title}</h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">{desc}</p>
            <div className="flex items-center justify-center gap-3 mt-8">
              <Button variant="outline" onClick={() => navigate("/")} data-testid="back-dashboard-btn" className="rounded-lg gap-2">
                <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
              </Button>
              <Button data-testid="notify-btn" className="rounded-lg gap-2"><Bell className="h-4 w-4" /> Notificar-me</Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
