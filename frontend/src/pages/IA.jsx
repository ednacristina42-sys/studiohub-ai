import { useState } from "react";
import { Briefcase, Camera, Wallet, Megaphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AssistantChat } from "@/components/AssistantChat";

const ASSISTANTS = [
  {
    key: "comercial",
    label: "Comercial",
    title: "Assistente Comercial",
    tagline: "Fecha mais negócio, mais depressa.",
    Icon: Briefcase,
    accent: "text-primary",
    actions: [
      "Cria uma proposta comercial para uma sessão de casamento",
      "Sugere um orçamento com valores para um ensaio de gravidez",
      "Escreve um email de follow-up para um lead que não respondeu",
      "Cria uma mensagem de WhatsApp cordial para um novo contacto",
      "Responde a um pedido de informação sobre preços de batizado",
      "Cria uma sequência de 3 follow-ups automáticos",
    ],
  },
  {
    key: "fotografico",
    label: "Fotográfico",
    title: "Assistente Fotográfico",
    tagline: "Planeia cada sessão ao detalhe.",
    Icon: Camera,
    accent: "text-sky-400",
    actions: [
      "Cria um roteiro completo para uma sessão de retrato",
      "Gera um checklist de casamento para o dia da cerimónia",
      "Faz a lista de equipamento para um casamento ao ar livre",
      "Cria um cronograma hora a hora de um casamento",
      "Sugere poses e locais para um ensaio de família",
    ],
  },
  {
    key: "financeiro",
    label: "Financeiro",
    title: "Assistente Financeiro",
    tagline: "Controla os números do teu estúdio.",
    Icon: Wallet,
    accent: "text-emerald-400",
    actions: [
      "Faz uma previsão de faturação para este mês",
      "Analisa o meu fluxo de caixa atual",
      "Lista os clientes em atraso e sugere como cobrar",
      "Ajuda-me a definir metas mensais de faturação",
      "Onde posso reduzir custos com base nas contas a pagar?",
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    title: "Assistente de Marketing",
    tagline: "Enche a agenda com marketing que converte.",
    Icon: Megaphone,
    accent: "text-fuchsia-400",
    actions: [
      "Cria um post para Instagram sobre sessões de outono",
      "Escreve a copy de um anúncio Meta para casamentos",
      "Cria títulos e descrições para um anúncio Google Ads",
      "Gera uma legenda apelativa com hashtags para uma foto",
      "Escreve um email de campanha para promoção de Natal",
    ],
  },
];

export default function IA() {
  const [active, setActive] = useState("comercial");
  const current = ASSISTANTS.find((a) => a.key === active);

  return (
    <div className="space-y-6" data-testid="ia-page">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Inteligência Artificial</p>
        <h1 className="font-display text-3xl sm:text-4xl font-light tracking-tight mt-1">Os teus 4 copilotos de estúdio.</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Cada assistente é especialista na sua área e tem acesso aos dados reais do teu negócio para gerar conteúdo pronto a usar.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ASSISTANTS.map((a) => {
          const Icon = a.Icon;
          const isActive = a.key === active;
          return (
            <button key={a.key} data-testid={`assistant-tab-${a.key}`} onClick={() => setActive(a.key)}
              className={`text-left rounded-xl border p-4 transition-all ${isActive ? "border-primary bg-accent/50 shadow-lg" : "border-border hover:border-primary/40 hover:bg-accent/20"}`}>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${isActive ? "bg-primary text-primary-foreground" : `bg-accent ${a.accent}`}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-display font-medium text-sm">{a.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{a.tagline}</p>
            </button>
          );
        })}
      </div>

      <Card className="p-6 border-border h-[62vh] flex flex-col" data-testid="assistant-panel">
        <div className="flex items-center gap-2 pb-4 border-b border-border mb-4">
          <div className={`h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center`}>
            <current.Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display font-medium">{current.title}</p>
            <p className="text-xs text-muted-foreground">Powered by OpenAI · dados reais do teu estúdio · com memória</p>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <AssistantChat key={current.key} assistant={current.key} Icon={current.Icon} accent={current.accent} actions={current.actions} placeholder={`Pede algo ao ${current.title}...`} />
        </div>
      </Card>
    </div>
  );
}
