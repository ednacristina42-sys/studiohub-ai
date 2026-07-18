import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { AiChat } from "@/components/AiChat";

export const AiAssistant = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button data-testid="ai-fab" onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center ai-glow hover:scale-105 transition-transform">
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-24 right-6 z-40 w-[calc(100vw-3rem)] sm:w-96 h-[520px] max-h-[70vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col p-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border mb-3">
              <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"><Sparkles className="h-4 w-4" /></div>
              <div><p className="font-display font-medium text-sm leading-tight">Assistente IA</p><p className="text-[10px] text-muted-foreground">StudioHub AI · gpt-5.4</p></div>
            </div>
            <div className="flex-1 min-h-0"><AiChat compact /></div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AiAssistant;
