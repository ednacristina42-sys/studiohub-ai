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
import Orcamentos from "@/pages/Orcamentos";
import Contratos from "@/pages/Contratos";
import IA from "@/pages/IA";
import ClientGallery from "@/pages/ClientGallery";
import Definicoes from "@/pages/Definicoes";
import ComingSoon from "@/pages/ComingSoon";
import { SettingsProvider } from "@/lib/settings";

const soon = [
  { path: "/loja", title: "Loja", desc: "Venda fotografias, impressões, álbuns e produtos com checkout." },
  { path: "/website", title: "Website", desc: "Portfólio, blog, SEO e domínio personalizado." },
  { path: "/marketing", title: "Marketing", desc: "Email, WhatsApp, redes sociais e landing pages." },
  { path: "/automacoes", title: "Automações", desc: "Fluxos automáticos para poupar horas de trabalho." },
];

function App() {
  useEffect(() => { api.post("/seed").catch(() => {}); }, []);
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <SettingsProvider>
      <div className="App grain">
        <Toaster position="top-right" richColors closeButton />
        <BrowserRouter>
          <Routes>
            <Route path="/g/:token" element={<ClientGallery />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clientes" element={<Clients />} />
              <Route path="/clientes/:id" element={<ClientDetail />} />
              <Route path="/sessoes" element={<Sessions />} />
              <Route path="/galerias" element={<Galleries />} />
              <Route path="/galerias/:id" element={<GalleryDetail />} />
              <Route path="/calendario" element={<CalendarPage />} />
              <Route path="/financeiro" element={<Financial />} />
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
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;
