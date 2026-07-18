import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Upload, Trash2, Star, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
  const fileRef = useRef(null);

  const load = () => api.get(`/galleries/${id}`).then((r) => setGallery(r.data));
  useEffect(() => { load(); }, [id]);

  const addPhoto = async (url, name) => {
    await api.post(`/galleries/${id}/photos`, { url, name });
    load();
  };

  const onFile = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const reader = new FileReader();
      await new Promise((res) => {
        reader.onload = async () => { await addPhoto(reader.result, f.name); res(); };
        reader.readAsDataURL(f);
      });
    }
    toast.success(`${files.length} foto(s) adicionada(s)`);
    e.target.value = "";
  };

  const addStock = async () => {
    const url = stock[(gallery?.photos?.length || 0) % stock.length];
    await addPhoto(url, "exemplo.jpg");
    toast.success("Foto de exemplo adicionada");
  };

  const removePhoto = async (pid) => { await api.delete(`/galleries/${id}/photos/${pid}`); load(); };

  const runAI = async () => {
    if (!gallery?.photos?.length) return toast.error("Adicione fotos primeiro");
    setAnalyzing(true);
    const t = toast.loading("A IA está a analisar as fotografias...");
    try {
      const r = await api.post(`/galleries/${id}/ai-select`);
      setGallery(r.data);
      toast.success("Seleção inteligente concluída", { id: t });
      setFilter("selected");
    } catch {
      toast.error("Falha na análise por IA", { id: t });
    } finally { setAnalyzing(false); }
  };

  if (!gallery) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div></div>;

  const photos = gallery.photos || [];
  const shown = filter === "selected" ? photos.filter((p) => p.ai_selected) : photos;
  const analyzed = photos.some((p) => p.ai_score != null);

  return (
    <div className="space-y-6">
      <Link to="/galerias" data-testid="back-galleries" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Galerias
      </Link>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-light tracking-tight">{gallery.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{gallery.client_name || "—"} · {photos.length} fotos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFile} data-testid="photo-file-input" />
          <Button variant="outline" data-testid="upload-photo-btn" onClick={() => fileRef.current?.click()} className="rounded-lg gap-2"><Upload className="h-4 w-4" /> Carregar</Button>
          <Button variant="outline" data-testid="add-stock-btn" onClick={addStock} className="rounded-lg gap-2"><ImagePlus className="h-4 w-4" /> Exemplo</Button>
          <Button data-testid="ai-select-btn" onClick={runAI} disabled={analyzing} className="rounded-lg gap-2 ai-glow">
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Seleção IA
          </Button>
        </div>
      </div>

      {analyzed && (
        <div className="flex gap-2">
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")} className="rounded-full" data-testid="filter-all">Todas ({photos.length})</Button>
          <Button size="sm" variant={filter === "selected" ? "default" : "outline"} onClick={() => setFilter("selected")} className="rounded-full gap-1.5" data-testid="filter-selected">
            <Sparkles className="h-3.5 w-3.5" /> Escolhas IA ({photos.filter((p) => p.ai_selected).length})
          </Button>
        </div>
      )}

      {photos.length === 0 ? (
        <Card className="p-16 border-dashed flex flex-col items-center text-center">
          <Upload className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-display text-lg">Galeria vazia</p>
          <p className="text-sm text-muted-foreground">Carregue fotos ou adicione um exemplo, depois execute a Seleção IA.</p>
        </Card>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {shown.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
              className={`relative group break-inside-avoid rounded-xl overflow-hidden border ${p.ai_selected ? "ai-glow border-primary/50" : "border-border"}`}>
              <img src={p.url} alt={p.name} className="w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              {p.ai_selected && (
                <Badge className="absolute top-2 left-2 rounded-full bg-primary text-primary-foreground gap-1 border-0"><Sparkles className="h-3 w-3" /> IA</Badge>
              )}
              {p.ai_score != null && (
                <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/50 backdrop-blur px-2 py-0.5 text-xs text-white">
                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" /> {Math.round(p.ai_score)}
                </div>
              )}
              <Button variant="ghost" size="icon" data-testid={`delete-photo-${p.id}`} onClick={() => removePhoto(p.id)} className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-white hover:text-destructive bg-black/40 backdrop-blur h-8 w-8">
                <Trash2 className="h-4 w-4" />
              </Button>
              {p.ai_reason && (
                <div className="absolute bottom-0 left-0 right-12 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-white/90 leading-snug">{p.ai_reason}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {p.ai_tags?.map((t) => <span key={t} className="text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5">{t}</span>)}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
