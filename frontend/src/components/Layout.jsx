import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, Users, Camera, Calendar, Images, FileText, FileSpreadsheet,
  Wallet, ShoppingBag, Globe, Megaphone, Sparkles, Workflow, Settings, Menu, Aperture,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AiAssistant } from "@/components/AiAssistant";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const groups = [
  { label: "Principal", items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" }] },
  { label: "Gestão", items: [
    { to: "/clientes", label: "Clientes", icon: Users, testid: "nav-clients" },
    { to: "/sessoes", label: "Sessões", icon: Camera, testid: "nav-sessions" },
    { to: "/calendario", label: "Calendário", icon: Calendar, testid: "nav-calendar" },
    { to: "/galerias", label: "Galerias", icon: Images, testid: "nav-galleries" },
  ]},
  { label: "Comercial", items: [
    { to: "/contratos", label: "Contratos", icon: FileText, testid: "nav-contracts" },
    { to: "/orcamentos", label: "Orçamentos", icon: FileSpreadsheet, testid: "nav-quotes" },
    { to: "/financeiro", label: "Financeiro", icon: Wallet, testid: "nav-financial" },
    { to: "/loja", label: "Loja", icon: ShoppingBag, testid: "nav-store" },
  ]},
  { label: "Crescimento", items: [
    { to: "/website", label: "Website", icon: Globe, testid: "nav-website" },
    { to: "/marketing", label: "Marketing", icon: Megaphone, testid: "nav-marketing" },
    { to: "/ia", label: "Inteligência Artificial", icon: Sparkles, testid: "nav-ai" },
    { to: "/automacoes", label: "Automações", icon: Workflow, testid: "nav-automations" },
  ]},
  { label: "Sistema", items: [{ to: "/definicoes", label: "Definições", icon: Settings, testid: "nav-settings" }] },
];

const allItems = groups.flatMap((g) => g.items);

const NavItems = ({ onNavigate }) => (
  <ScrollArea className="flex-1 px-3">
    <div className="pb-6">
      {groups.map((g) => (
        <div key={g.label} className="mt-5 first:mt-0">
          <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold">{g.label}</p>
          <nav className="flex flex-col gap-0.5">
            {g.items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === "/"} data-testid={item.testid} onClick={onNavigate}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                    isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}>
                {({ isActive }) => (<><item.icon className={`h-[17px] w-[17px] shrink-0 transition-colors ${isActive ? "text-primary" : ""}`} />{item.label}</>)}
              </NavLink>
            ))}
          </nav>
        </div>
      ))}
    </div>
  </ScrollArea>
);

const Brand = () => (
  <div className="flex items-center gap-2.5 px-5 h-16 shrink-0 border-b border-border">
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <Aperture className="h-5 w-5" />
    </div>
    <div className="leading-tight">
      <p className="font-display font-semibold text-[15px] tracking-tight">StudioHub</p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold flex items-center gap-1"><Sparkles className="h-2.5 w-2.5" /> AI</p>
    </div>
  </div>
);

export const Layout = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const current = allItems.find((n) => n.to === location.pathname) || allItems.find((n) => location.pathname.startsWith(n.to) && n.to !== "/");

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex md:flex-col md:w-64 border-r border-border fixed inset-y-0 bg-background z-20">
        <Brand />
        <NavItems />
        <div className="p-4 border-t border-border shrink-0">
          <p className="text-[11px] text-muted-foreground">Plataforma de gestão para fotógrafos</p>
        </div>
      </aside>

      <div className="flex-1 md:pl-64 relative z-10">
        <header className="sticky top-0 z-30 h-16 border-b border-border backdrop-blur-xl bg-background/70 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" data-testid="mobile-menu-btn"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 flex flex-col">
                <Brand />
                <NavItems onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <h1 className="font-display text-lg font-medium tracking-tight">{current?.label || "StudioHub AI"}</h1>
          </div>
          <ThemeToggle />
        </header>
        <main className="p-4 md:p-8 max-w-[1500px]"><Outlet /></main>
      </div>
      <AiAssistant />
    </div>
  );
};

export default Layout;
