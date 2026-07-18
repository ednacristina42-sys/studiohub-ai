import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, Users, FolderKanban, Images, Calendar, Receipt, Menu, Aperture, Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/", label: "Painel", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/clientes", label: "Clientes", icon: Users, testid: "nav-clients" },
  { to: "/projetos", label: "Projetos", icon: FolderKanban, testid: "nav-projects" },
  { to: "/galerias", label: "Galerias", icon: Images, testid: "nav-galleries" },
  { to: "/calendario", label: "Calendário", icon: Calendar, testid: "nav-calendar" },
  { to: "/financeiro", label: "Financeiro", icon: Receipt, testid: "nav-financial" },
];

const NavItems = ({ onNavigate }) => (
  <nav className="flex flex-col gap-1 px-3">
    {nav.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === "/"}
        data-testid={item.testid}
        onClick={onNavigate}
        className={({ isActive }) =>
          `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isActive
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`
        }
      >
        {({ isActive }) => (
          <>
            <item.icon className={`h-[18px] w-[18px] transition-colors ${isActive ? "text-primary" : ""}`} />
            {item.label}
          </>
        )}
      </NavLink>
    ))}
  </nav>
);

const Brand = () => (
  <div className="flex items-center gap-2.5 px-5 h-16">
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <Aperture className="h-5 w-5" />
    </div>
    <div className="leading-tight">
      <p className="font-display font-semibold text-[15px] tracking-tight">StudioHub</p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold flex items-center gap-1">
        <Sparkles className="h-2.5 w-2.5" /> AI
      </p>
    </div>
  </div>
);

export const Layout = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const current = nav.find((n) => n.to === location.pathname);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 border-r border-border fixed inset-y-0 bg-background z-20">
        <Brand />
        <div className="mt-4 flex-1">
          <NavItems />
        </div>
        <div className="p-5 border-t border-border">
          <p className="text-xs text-muted-foreground">Gestão para fotógrafos</p>
        </div>
      </aside>

      <div className="flex-1 md:pl-64 relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 border-b border-border backdrop-blur-xl bg-background/70 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" data-testid="mobile-menu-btn">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <Brand />
                <div className="mt-4">
                  <NavItems onNavigate={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="font-display text-lg font-medium tracking-tight">{current?.label || "StudioHub AI"}</h1>
          </div>
          <ThemeToggle />
        </header>

        <main className="p-4 md:p-8 max-w-[1400px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
