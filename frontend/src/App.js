import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { api } from "@/lib/api";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import Projects from "@/pages/Projects";
import Galleries from "@/pages/Galleries";
import GalleryDetail from "@/pages/GalleryDetail";
import CalendarPage from "@/pages/CalendarPage";
import Financial from "@/pages/Financial";

function App() {
  useEffect(() => {
    api.post("/seed").catch(() => {});
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <div className="App grain">
        <Toaster position="top-right" richColors closeButton />
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clientes" element={<Clients />} />
              <Route path="/projetos" element={<Projects />} />
              <Route path="/galerias" element={<Galleries />} />
              <Route path="/galerias/:id" element={<GalleryDetail />} />
              <Route path="/calendario" element={<CalendarPage />} />
              <Route path="/financeiro" element={<Financial />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;
