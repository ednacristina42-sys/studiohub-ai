import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Clock, Aperture } from "lucide-react";
import { api, eur } from "@/lib/api";
import { Button } from "@/components/ui/button";

const MAX_POLLS = 12;

export function PaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get("session_id");
  const [state, setState] = useState("polling"); // polling | paid | pending | error
  const [order, setOrder] = useState(null);
  const attempts = useRef(0);

  useEffect(() => {
    if (!sessionId) { setState("error"); return; }
    let timer;
    const poll = async () => {
      try {
        const r = await api.get(`/public/checkout/status/${sessionId}`);
        setOrder(r.data);
        if (r.data.payment_status === "paid") { setState("paid"); return; }
        if (r.data.payment_status === "failed") { setState("error"); return; }
        attempts.current += 1;
        if (attempts.current >= MAX_POLLS) { setState("pending"); return; }
        timer = setTimeout(poll, 2000);
      } catch {
        attempts.current += 1;
        if (attempts.current >= MAX_POLLS) { setState("error"); return; }
        timer = setTimeout(poll, 2000);
      }
    };
    poll();
    return () => clearTimeout(timer);
  }, [sessionId]);

  const back = () => navigate("/");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" data-testid="payment-success-page">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center border border-border rounded-3xl p-10 bg-card shadow-sm">
        <div className="flex items-center justify-center gap-2 mb-8 text-muted-foreground">
          <Aperture className="h-5 w-5" /><span className="font-display tracking-tight">StudioHub</span>
        </div>
        {state === "polling" && (
          <div data-testid="payment-polling">
            <Loader2 className="h-14 w-14 mx-auto text-primary animate-spin" />
            <h1 className="font-display text-2xl font-medium mt-6">A confirmar o pagamento…</h1>
            <p className="text-sm text-muted-foreground mt-2">Aguarda um instante, estamos a validar com a Stripe.</p>
          </div>
        )}
        {state === "paid" && (
          <div data-testid="payment-paid">
            <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-500" />
            <h1 className="font-display text-2xl font-medium mt-6">Pagamento confirmado!</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Obrigado. O teu pedido <b>{order?.order_number}</b> foi pago
              {order?.total ? ` (${eur(order.total)})` : ""} e já está com o estúdio.
            </p>
            <Button data-testid="success-back-btn" onClick={back} className="mt-8 rounded-lg w-full">Concluído</Button>
          </div>
        )}
        {state === "pending" && (
          <div data-testid="payment-pending">
            <Clock className="h-16 w-16 mx-auto text-amber-500" />
            <h1 className="font-display text-2xl font-medium mt-6">Pagamento em processamento</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Recebemos o teu pedido <b>{order?.order_number}</b>. A confirmação pode demorar alguns instantes —
              vais receber a atualização assim que o pagamento for validado.
            </p>
            <Button data-testid="pending-back-btn" onClick={back} variant="outline" className="mt-8 rounded-lg w-full">Voltar</Button>
          </div>
        )}
        {state === "error" && (
          <div data-testid="payment-status-error">
            <XCircle className="h-16 w-16 mx-auto text-rose-500" />
            <h1 className="font-display text-2xl font-medium mt-6">Não foi possível confirmar</h1>
            <p className="text-sm text-muted-foreground mt-2">Ocorreu um problema ao verificar o pagamento. Contacta o estúdio se o valor foi debitado.</p>
            <Button data-testid="error-back-btn" onClick={back} variant="outline" className="mt-8 rounded-lg w-full">Voltar</Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export function PaymentCancel() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" data-testid="payment-cancel-page">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center border border-border rounded-3xl p-10 bg-card shadow-sm">
        <div className="flex items-center justify-center gap-2 mb-8 text-muted-foreground">
          <Aperture className="h-5 w-5" /><span className="font-display tracking-tight">StudioHub</span>
        </div>
        <XCircle className="h-16 w-16 mx-auto text-muted-foreground" />
        <h1 className="font-display text-2xl font-medium mt-6">Pagamento cancelado</h1>
        <p className="text-sm text-muted-foreground mt-2">Não foi cobrado nenhum valor. Podes voltar à galeria e tentar novamente quando quiseres.</p>
        <Button data-testid="cancel-back-btn" onClick={() => navigate(-1)} className="mt-8 rounded-lg w-full">Voltar à galeria</Button>
      </motion.div>
    </div>
  );
}
