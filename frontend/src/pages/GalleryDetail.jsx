import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Sparkles, Upload, Trash2, Star, Loader2, ImagePlus, Search, Share2, Copy,
  Heart, CheckCircle2, XCircle, Columns2, X, MessageSquare, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbox } from "@/components/Lightbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const stock = [
  "https://images.pexels.com/photos/7778884/pexels-photo-7778884.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  "https://images.pexels.com/photos/23876288/pexels-photo-23876288.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  "https://images.pexels.com/photos/5804239/pexels-photo-5804239.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  "https://images.pexels.com/photos/8015871/pexels-photo-8015871.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
];

export default function GalleryDetail() {
  const { id } = useParams();
  const [gallery, setGallery] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recentes");
  const [searchIds, setSearchIds] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [lightbox, setLightbox] = useState(-1);
  const [compare, setCompare] = useState([]);
  const [settings, setSettings] = useState({ password: "", link_expires: "", watermark: false });
  const fileRef = useRef(null);

  const load = () => api.get(`/galleries/${id}`).then((r) => { setGallery(r.data); setSettings({ password: r.data.password || "", link_expires: r.data.link_expires || "", watermark: !!r.data.watermark }); });
  useEffect(() => { load(); }, [id]);

  const addPhoto = async (url, name) => { await api.post(`/galleries/${id}/photos`, { url, name }); load(); };
  const onFile = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const reader = new FileReader();
      await new Promise((res) => { reader.onload = async () => { await addPhoto(reader.result, f.name); res(); }; reader.readAsDataURL(f); });
    }
    toast.success(`${files.length} foto(s) adicionada(s)`); e.target.value = "";
  };
  const addStock = async () => { await addPhoto(stock[(gallery?.photos?.length || 0) % stock.length], "exemplo.jpg"); toast.success("Foto de exemplo adicionada"); };
  const removePhoto = async (pid) => { await api.delete(`/galleries/${id}/photos/${pid}`); load(); };
  const toggleFeature = async (pid) => { const r = await api.patch(`/galleries/${id}/photos/${pid}/feature`); setGallery(r.data); };

  const runAI = async () => {
    if (!gallery?.photos?.length) return toast.error("Adicione fotos primeiro");
    setAnalyzing(true);
    const t = toast.loading("A IA está a analisar as fotografias...");
    try { const r = await api.post(`/galleries/${id}/ai-select`); setGallery(r.data); toast.success("Seleção inteligente concluída", { id: t }); setFilter("ai"); }
    catch { toast.error("Falha na análise por IA", { id: t }); }
    finally { setAnalyzing(false); }
  };

  const aiSearch = async () => {
    if (!searchText.trim()) { setSearchIds(null); return; }
    setSearching(true);
    const t = toast.loading("Pesquisa inteligente...");
    try { const r = await api.post(`/galleries/${id}/ai-search`, { query: searchText }); setSearchIds(r.data.ids); load(); toast.success(`${r.data.ids.length} resultado(s)`, { id: t }); }
    catch { toast.error("Falha na pesquisa", { id: t }); }
    finally { setSearching(false); }
  };

  const saveSettings = async () => {
    await api.patch(`/galleries/${id}/settings`, settings);
    toast.success("Definições guardadas"); load();
  };
  const share = async () => {
    const r = await api.post(`/galleries/${id}/share`); setGallery(r.data);
    const url = `${window.location.origin}/g/${r.data.access_token}`;
    navigator.clipboard?.writeText(url); toast.success("Link privado copiado");
  };

  const toggleCompare = (pid) => setCompare((c) => c.includes(pid) ? c.filter((x) => x !== pid) : (c.length < 2 ? [...c, pid] : [c[1], pid]));

  if (!gallery) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div></div>;

  let photos = gallery.photos || [];
  const analyzed = photos.some((p) => p.ai_score != null);
  const clientLink = gallery.access_token ? `${window.location.origin}/g/${gallery.access_token}` : "";

  let shown = photos;
  if (searchIds) shown = shown.filter((p) => searchIds.includes(p.id));
  if (filter === "ai") shown = shown.filter((p) => p.ai_selected);
  if (filter === "featured") shown = shown.filter((p) => p.featured);
  if (filter === "cselected") shown = shown.filter((p) => p.client_selected);
  if (filter === "cfav") shown = shown.filter((p) => p.client_favorite);
  if (filter === "approved") shown = shown.filter((p) => p.approval === "aprovada");
  shown = [...shown].sort((a, b) => sort === "score" ? (b.ai_score || 0) - (a.ai_score || 0) : 0);

  const compared = compare.map((cid) => photos.find((p) => p.id === cid)).filter(Boolean);

  return (
    <div className="space-y-6">
      <Link to="/galerias" data-testid="back-galleries" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="h-4 w-4" /> Galerias</Link>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-light tracking-tight">{gallery.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{gallery.client_name || "—"} · {photos.length} fotos{gallery.watermark ? " · marca de água" : ""}{gallery.password ? " · protegida" : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFile} data-testid="photo-file-input" />
          <Button variant="outline" data-testid="upload-photo-btn" onClick={() => fileRef.current?.click()} className="rounded-lg gap-2"><Upload className="h-4 w-4" /> Carregar</Button>
          <Button variant="outline" data-testid="add-stock-btn" onClick={addStock} className="rounded-lg gap-2"><ImagePlus className="h-4 w-4" /> Exemplo</Button>
          <Button data-testid="ai-select-btn" onClick={runAI} disabled={analyzing} className="rounded-lg gap-2 ai-glow">{analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Seleção IA</Button>
          <Dialog>
            <DialogTrigger asChild><Button variant="outline" data-testid="share-btn" className="rounded-lg gap-2"><Share2 className="h-4 w-4" /> Partilhar</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle className="font-display font-medium">Partilhar galeria</DialogTitle><DialogDescription>Link privado para o cliente aceder à galeria.</DialogDescription></DialogHeader>
              <div className="space-y-4 py-2">
                <div><Label>Palavra-passe (opcional)</Label><Input data-testid="gallery-password-input" value={settings.password} onChange={(e) => setSettings({ ...settings, password: e.target.value })} className="h-11 mt-1.5" placeholder="Deixe vazio para acesso livre" /></div>
                <div><Label>Expiração do link</Label><Input type="date" value={settings.link_expires} onChange={(e) => setSettings({ ...settings, link_expires: e.target.value })} className="h-11 mt-1.5" /></div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3"><div><p className="text-sm font-medium">Marca de água</p><p className="text-xs text-muted-foreground">Aplicada na visualização do cliente</p></div><Switch data-testid="watermark-switch" checked={settings.watermark} onCheckedChange={(v) => setSettings({ ...settings, watermark: v })} /></div>
                <Button data-testid="save-settings-btn" onClick={saveSettings} className="w-full rounded-lg">Guardar definições</Button>
                <div className="pt-2 border-t border-border space-y-2">
                  <Button data-testid="generate-link-btn" onClick={share} variant="outline" className="w-full rounded-lg gap-2"><Copy className="h-4 w-4" /> {clientLink ? "Copiar link privado" : "Gerar link privado"}</Button>
                  {clientLink && <p className="text-xs text-muted-foreground break-all font-mono">{clientLink}</p>}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* AI search + controls */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input data-testid="ai-search-input" value={searchText} onChange={(e) => setSearchText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && aiSearch()} placeholder='Pesquisa IA: "fotos ao pôr do sol"...' className="h-11 pl-9 pr-24" />
          <Button size="sm" data-testid="ai-search-btn" onClick={aiSearch} disabled={searching} className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 rounded-md gap-1">{searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} IA</Button>
        </div>
        {searchIds && <Button variant="ghost" size="sm" onClick={() => { setSearchIds(null); setSearchText(""); }} className="gap-1 text-xs"><X className="h-3.5 w-3.5" /> Limpar pesquisa</Button>}
        <div className="flex items-center gap-2 md:ml-auto">
          <Button variant={compare.length ? "default" : "outline"} size="sm" data-testid="compare-toggle" onClick={() => setCompare([])} className="rounded-lg gap-1.5"><Columns2 className="h-4 w-4" /> {compare.length ? `Comparar (${compare.length})` : "Comparar"}</Button>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-9 w-40 gap-1.5"><Filter className="h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="recentes">Mais recentes</SelectItem><SelectItem value="score">Pontuação IA</SelectItem></SelectContent>
          </Select>
        </div>
      </div>

      {/* filter chips */}
      <div className="flex flex-wrap gap-2">
        {[["all", `Todas (${photos.length})`], analyzed && ["ai", "Escolhas IA"], ["featured", "Destacadas"], ["cselected", "Selec. cliente"], ["cfav", "Favoritas cliente"], ["approved", "Aprovadas"]].filter(Boolean).map(([k, l]) => (
          <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} data-testid={`filter-${k}`} onClick={() => setFilter(k)} className="rounded-full">{l}</Button>
        ))}
      </div>

      {/* comparison view */}
      {compared.length === 2 && (
        <Card className="p-4 border-border">
          <p className="text-sm font-medium mb-3 flex items-center gap-2"><Columns2 className="h-4 w-4 text-primary" /> Comparação lado a lado</p>
          <div className="grid grid-cols-2 gap-4">
            {compared.map((p) => (
              <div key={p.id} className="relative rounded-lg overflow-hidden border border-border">
                <img src={p.url} alt={p.name} className="w-full h-72 object-cover" />
                {p.ai_score != null && <Badge className="absolute top-2 right-2 rounded-full bg-black/60 text-white border-0">IA {Math.round(p.ai_score)}</Badge>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {photos.length === 0 ? (
        <Card className="p-16 border-dashed flex flex-col items-center text-center"><Upload className="h-10 w-10 text-muted-foreground mb-3" /><p className="font-display text-lg">Galeria vazia</p><p className="text-sm text-muted-foreground">Carregue fotos ou adicione um exemplo.</p></Card>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {shown.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}
              className={`relative group break-inside-avoid rounded-xl overflow-hidden border ${p.ai_selected ? "ai-glow border-primary/50" : compare.includes(p.id) ? "border-primary" : "border-border"}`}>
              <img src={p.url} alt={p.name} onClick={() => setLightbox(photos.indexOf(p))} className="w-full object-cover cursor-zoom-in" />
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {p.ai_selected && <Badge className="rounded-full bg-primary text-primary-foreground gap-1 border-0"><Sparkles className="h-3 w-3" /> IA</Badge>}
                {p.featured && <Badge className="rounded-full bg-amber-500 text-white border-0 gap-1"><Star className="h-3 w-3" /> Destaque</Badge>}
              </div>
              {p.ai_score != null && <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/50 backdrop-blur px-2 py-0.5 text-xs text-white"><Star className="h-3 w-3 text-amber-400 fill-amber-400" /> {Math.round(p.ai_score)}</div>}
              {/* client feedback */}
              <div className="absolute bottom-2 left-2 flex gap-1">
                {p.client_favorite && <span className="h-6 w-6 rounded-full bg-rose-500/90 flex items-center justify-center text-white" title="Favorita do cliente"><Heart className="h-3 w-3 fill-current" /></span>}
                {p.client_selected && <span className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground" title="Selecionada pelo cliente"><CheckCircle2 className="h-3 w-3" /></span>}
                {p.approval === "aprovada" && <span className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center text-white" title="Aprovada"><CheckCircle2 className="h-3 w-3" /></span>}
                {p.approval === "rejeitada" && <span className="h-6 w-6 rounded-full bg-zinc-600 flex items-center justify-center text-white" title="Rejeitada"><XCircle className="h-3 w-3" /></span>}
                {p.comments?.length > 0 && <span className="h-6 rounded-full bg-black/60 flex items-center gap-1 px-2 text-white text-[10px]" title="Comentários"><MessageSquare className="h-3 w-3" />{p.comments.length}</span>}
              </div>
              <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" data-testid={`compare-${p.id}`} onClick={() => toggleCompare(p.id)} className={`h-7 w-7 bg-black/40 backdrop-blur text-white hover:text-primary ${compare.includes(p.id) ? "text-primary" : ""}`}><Columns2 className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" data-testid={`feature-${p.id}`} onClick={() => toggleFeature(p.id)} className={`h-7 w-7 bg-black/40 backdrop-blur text-white hover:text-amber-400 ${p.featured ? "text-amber-400" : ""}`}><Star className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" data-testid={`delete-photo-${p.id}`} onClick={() => removePhoto(p.id)} className="h-7 w-7 bg-black/40 backdrop-blur text-white hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {lightbox >= 0 && <Lightbox photos={photos} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(-1)} watermark={gallery.watermark} />}
    </div>
  );
}
