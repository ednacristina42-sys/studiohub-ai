import { useEffect, useState, useCallback } from "react";
import { Bell, ShoppingBag, CheckCircle2, XCircle, PackageCheck, CheckCheck } from "lucide-react";
import { api, fmtDate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

const ICONS = {
  new_order: ShoppingBag,
  payment_received: CheckCircle2,
  order_cancelled: XCircle,
  order_completed: PackageCheck,
};
const COLORS = {
  new_order: "text-sky-500",
  payment_received: "text-emerald-500",
  order_cancelled: "text-rose-500",
  order_completed: "text-violet-500",
};

export const NotificationBell = () => {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const loadCount = useCallback(() => {
    api.get("/notifications/unread-count").then((r) => setUnread(r.data.count || 0)).catch(() => {});
  }, []);
  const loadList = useCallback(() => {
    api.get("/notifications").then((r) => setItems(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    loadCount();
    const t = setInterval(loadCount, 20000);
    return () => clearInterval(t);
  }, [loadCount]);

  useEffect(() => { if (open) loadList(); }, [open, loadList]);

  const markAll = async () => {
    await api.post("/notifications/read-all").catch(() => {});
    setUnread(0);
    setItems((it) => it.map((n) => ({ ...n, read: true })));
  };
  const markOne = async (n) => {
    if (n.read) return;
    await api.post(`/notifications/${n.id}/read`).catch(() => {});
    setItems((it) => it.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="notifications-bell" className="relative rounded-lg">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span data-testid="notifications-unread-badge" className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-medium flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" data-testid="notifications-panel">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="font-display font-medium text-sm">Notificações</p>
          {unread > 0 && (
            <button data-testid="notifications-mark-all" onClick={markAll} className="text-xs text-primary flex items-center gap-1 hover:opacity-80">
              <CheckCheck className="h-3.5 w-3.5" /> Marcar todas
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Sem notificações.</p>
          ) : (
            <div className="divide-y divide-border">
              {items.map((n) => {
                const Icon = ICONS[n.type] || Bell;
                return (
                  <button key={n.id} data-testid={`notification-${n.id}`} onClick={() => markOne(n)}
                    className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors ${n.read ? "opacity-60" : ""}`}>
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${COLORS[n.type] || "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">{fmtDate(n.created_at)}</p>
                    </div>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
