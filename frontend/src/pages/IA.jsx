import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AiChat } from "@/components/AiChat";

const CAPABILITIES = [
  "Criar orçamentos e propostas",
  "Redigir contratos e emails",
  "Consultar clientes por pagar",
  "Criar campanhas de marketing",
  "Resumos e sugestões inteligentes",
];

export default function IA() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="p-6 border-border h-[70vh] flex flex-col">
          <div className="flex items-center gap-2 pb-4 border-b border-border mb-4">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"><Sparkles className="h-5 w-5" /></div>
            <div><p className="font-display font-medium">Assistente Inteligente</p><p className="text-xs text-muted-foreground">Powered by OpenAI gpt-5.4</p></div>
          </div>
          <div className="flex-1 min-h-0"><AiChat /></div>
        </Card>
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">O que consigo fazer</p>
          <h2 className="font-display text-2xl font-light tracking-tight mt-1">O seu copiloto de estúdio.</h2>
        </div>
        <Card className="p-5 border-border">
          <ul className="space-y-3">
            {CAPABILITIES.map((c) => (
              <li key={c} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 h-5 w-5 rounded-md bg-accent flex items-center justify-center text-primary shrink-0"><Sparkles className="h-3 w-3" /></span>
                {c}
              </li>
            ))}
          </ul>
        </Card>
        <p className="text-xs text-muted-foreground leading-relaxed">O assistente tem acesso a um resumo do seu negócio (clientes, faturas por pagar, próximas sessões) para dar respostas contextualizadas.</p>
      </div>
    </div>
  );
}
