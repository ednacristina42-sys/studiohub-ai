import { NavLink, Outlet, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useState } from "react";
import {
  Home, Camera, Images, FileText, FileSpreadsheet, Receipt, Download, User, Aperture, Menu, LogOut, Loader2,
} from "lucide-react";
import { usePortalAuth } from "@/lib/portalAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const nav = [
  { to: "/portal", label: "Início", icon: Home, end: true, testid: "pnav-home" },
  { to: "/portal/sessoes", label: "As minhas sessões", icon: Camera, testid: "pnav-sessions" },
  { to: "/portal/galerias", label: "As minhas galerias", icon: Images, testid: "pnav-galleries" },
  { to: "/portal/contratos", label: "Contratos", icon: FileText, testid: "pnav-contracts" },
  { to: "/portal/orcamentos", label: "Orçamentos", icon: FileSpreadsheet, testid: "pnav-quotes" },
  { to: "/portal/faturas", label: "Faturas", icon: Receipt, testid: "pnav-invoices" },
  { to: "/portal/downloads", label: "Downloads", icon: Download, testid: "pnav-downloads" },
  { to: "/portal/perfil", label: "Perfil", icon: User, testid: "pnav-profile" },
];

const Items = ({ onNav }) => (
  <nav className="flex flex-col gap-1 px-3 mt-4">
    {nav.map((i) => (
      <NavLink key={i.to} to={i.to} end={i.end} data-testid={i.testid} onClick={onNav}
        className={({ isActive }) => `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
        {({ isActive }) => (<><i.icon className={`h-[18px] w-[18px] ${isActive ? "text-primary" : ""}`} />{i.label}</>)}
      </NavLink>
    ))}
  </nav>
);

const Brand = () => (
  <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border shrink-0">
    <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"><Aperture className="h-5 w-5" /></div>
    <div className="leading-tight"><p className="font-display font-semibold text-[15px]">StudioHub</p><p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">Cliente</p></div>
  </div>
);

export default function PortalLayout() {
  const { client, ready, logout } = usePortalAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (!ready) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!client) return <Navigate to="/portal/login" replace />;

  const current = nav.find((n) => n.to === location.pathname) || nav.find((n) => location.pathname.startsWith(n.to) && !n.end);
  const doLogout = () => { logout(); navigate("/portal/login"); };

  return (
    <div className="min-h-screen flex bg-background grain">
      <aside className="hidden md:flex md:flex-col md:w-64 border-r border-border fixed inset-y-0 bg-background z-20">
        <Brand /><Items />
        <div className="mt-auto p-4 border-t border-border">
          <Button variant="ghost" data-testid="portal-logout-btn" onClick={doLogout} className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"><LogOut className="h-4 w-4" /> Sair</Button>
        </div>
      </aside>
      <div className="flex-1 md:pl-64 relative z-10">
        <header className="sticky top-0 z-30 h-16 border-b border-border backdrop-blur-xl bg-background/70 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden"><Menu className="h-5 w-5" /></Button></SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 flex flex-col"><Brand /><Items onNav={() => setOpen(false)} /></SheetContent>
            </Sheet>
            <h1 className="font-display text-lg font-medium tracking-tight">{current?.label || "Área do Cliente"}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
              <Avatar className="h-8 w-8"><AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">{client.name?.charAt(0)}</AvatarFallback></Avatar>
              <span className="text-sm font-medium">{client.name}</span>
            </div>
          </div>
        </header>
        <main className="p-4 md:p-8 max-w-[1300px]"><Outlet /></main>
      </div>
    </div>
  );
}
