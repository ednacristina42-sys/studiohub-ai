import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { api } from "@/lib/api";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Sessions from "@/pages/Sessions";
import Galleries from "@/pages/Galleries";
import GalleryDetail from "@/pages/GalleryDetail";
import CalendarPage from "@/pages/CalendarPage";
import Financial from "@/pages/Financial";
import Reports from "@/pages/Reports";
import Store from "@/pages/Store";
import Orcamentos from "@/pages/Orcamentos";
import Contratos from "@/pages/Contratos";
import IA from "@/pages/IA";
import ClientGallery from "@/pages/ClientGallery";
import { PaymentSuccess, PaymentCancel } from "@/pages/PaymentResult";
import Definicoes from "@/pages/Definicoes";
import ComingSoon from "@/pages/ComingSoon";
import { SettingsProvider } from "@/lib/settings";
import { PanelProvider } from "@/lib/panels";
import { AuthProvider, useAuth } from "@/lib/auth";
import StudioAuth from "@/pages/StudioAuth";
import ResetPassword from "@/pages/ResetPassword";
import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { PortalAuthProvider } from "@/lib/portalAuth";
import PortalLogin from "@/pages/portal/PortalLogin";
import PortalLayout from "@/pages/portal/PortalLayout";
import {
  PortalDashboard, PortalSessions, PortalGalleries, PortalContracts,
  PortalQuotes, PortalInvoices, PortalDownloads, PortalProfile,
} from "@/pages/portal/PortalPages";

const soon = [
  { path: "/website", title: "Website", desc: "Portfólio, blog, SEO e domínio personalizado." },
  { path: "/marketing", title: "Marketing", desc: "Email, WhatsApp, redes sociais e landing pages." },
  { path: "/automacoes", title: "Automações", desc: "Fluxos automáticos para poupar horas de trabalho." },
];

const ProtectedRoute = ({ children }) => {
  const { user, ready } = useAuth();
  if (!ready) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  useEffect(() => { api.post("/seed").catch(() => {}); }, []);
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <SettingsProvider>
      <AuthProvider>
      <PanelProvider>
      <div className="App grain">
        <Toaster position="top-right" richColors closeButton />
        <BrowserRouter>
          <Routes>
            <Route path="/g/:token" element={<ClientGallery />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
            <Route path="/login" element={<StudioAuth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/portal/login" element={<PortalAuthProvider><PortalLogin /></PortalAuthProvider>} />
            <Route path="/portal" element={<PortalAuthProvider><PortalLayout /></PortalAuthProvider>}>
              <Route index element={<PortalDashboard />} />
              <Route path="sessoes" element={<PortalSessions />} />
              <Route path="galerias" element={<PortalGalleries />} />
              <Route path="contratos" element={<PortalContracts />} />
              <Route path="orcamentos" element={<PortalQuotes />} />
              <Route path="faturas" element={<PortalInvoices />} />
              <Route path="downloads" element={<PortalDownloads />} />
              <Route path="perfil" element={<PortalProfile />} />
            </Route>
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clientes" element={<Clients />} />
              <Route path="/clientes/:id" element={<ClientDetail />} />
              <Route path="/sessoes" element={<Sessions />} />
              <Route path="/galerias" element={<Galleries />} />
              <Route path="/galerias/:id" element={<GalleryDetail />} />
              <Route path="/calendario" element={<CalendarPage />} />
              <Route path="/financeiro" element={<Financial />} />
              <Route path="/financeiro/relatorios" element={<Reports />} />
              <Route path="/loja" element={<Store />} />
              <Route path="/orcamentos" element={<Orcamentos />} />
              <Route path="/contratos" element={<Contratos />} />
              <Route path="/ia" element={<IA />} />
              <Route path="/definicoes" element={<Definicoes />} />
              {soon.map((s) => (
                <Route key={s.path} path={s.path} element={<ComingSoon title={s.title} desc={s.desc} />} />
              ))}
            </Route>
          </Routes>
        </BrowserRouter>
      </div>
      </PanelProvider>
      </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;
