import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Play, Pause, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Lightbox = ({ photos, index, onClose, onIndex, watermark = false, renderActions }) => {
  const [zoom, setZoom] = useState(1);
  const [playing, setPlaying] = useState(false);
  const photo = photos[index];

  const go = useCallback((dir) => {
    setZoom(1);
    onIndex((index + dir + photos.length) % photos.length);
  }, [index, photos.length, onIndex]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => go(1), 2500);
    return () => clearInterval(t);
  }, [playing, go]);

  if (!photo) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm flex flex-col" data-testid="lightbox">
        <div className="flex items-center justify-between p-4 text-white/90">
          <span className="text-sm">{index + 1} / {photos.length} · {photo.name}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} className="text-white hover:bg-white/10"><ZoomOut className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(4, z + 0.5))} data-testid="lightbox-zoom" className="text-white hover:bg-white/10"><ZoomIn className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setPlaying((p) => !p)} data-testid="lightbox-slideshow" className="text-white hover:bg-white/10">{playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</Button>
            <a href={photo.url} download={photo.name || "foto.jpg"} target="_blank" rel="noreferrer"><Button variant="ghost" size="icon" className="text-white hover:bg-white/10"><Download className="h-5 w-5" /></Button></a>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="lightbox-close" className="text-white hover:bg-white/10"><X className="h-5 w-5" /></Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center relative overflow-hidden px-4">
          <Button variant="ghost" size="icon" onClick={() => go(-1)} data-testid="lightbox-prev" className="absolute left-4 z-10 h-11 w-11 rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronLeft className="h-6 w-6" /></Button>
          <div className="relative max-h-full max-w-full overflow-auto">
            <img src={photo.url} alt={photo.name} style={{ transform: `scale(${zoom})` }} className="max-h-[75vh] object-contain transition-transform duration-200 select-none" />
            {watermark && <span className="absolute inset-0 flex items-center justify-center text-white/30 font-display text-4xl rotate-[-20deg] pointer-events-none">StudioHub AI</span>}
          </div>
          <Button variant="ghost" size="icon" onClick={() => go(1)} data-testid="lightbox-next" className="absolute right-4 z-10 h-11 w-11 rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronRight className="h-6 w-6" /></Button>
        </div>
        {renderActions && <div className="p-4 flex items-center justify-center gap-2">{renderActions(photo)}</div>}
      </motion.div>
    </AnimatePresence>
  );
};

export default Lightbox;
