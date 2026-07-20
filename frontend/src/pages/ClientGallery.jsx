import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Lock, Heart, CheckCircle2, XCircle, Aperture, ShoppingBag, Download, Sparkles, MessageSquare, Send, Loader2, Plus, Minus, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api, eur } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Lightbox } from "@/components/Lightbox";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ClientGallery() {
  const { token } = useParams();
  const [gallery, setGallery] = useState(null);
  const [protectedGate, setProtectedGate] = useState(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(-1);
  const [filter, setFilter] = useState("all");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [comment, setComment] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [buyPhoto, setBuyPhoto] = useState(null);
  const [buyProduct, setBuyProduct] = useState("");
  const [buyQty, setBuyQty] = useState(1);
  const [buyNotes, setBuyNotes] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "", notes: "" });
  const [placing, setPlacing] = useState(false);

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/public/galleries/${token}`);
      if (r.data.protected) setProtectedGate(r.data);
      else { setGallery(r.data); setProtectedGate(null); }
    } catch (e) {
      toast.error(e?.response?.status === 410 ? "O link expirou" : "Galeria não encontrada");
    } finally { setLoading(false); }
  };
  useEffect(() => { fetchGallery(); api.get("/store/products?active=true").then((r) => setProducts(r.data)); }, [token]);

  const verify = async () => {
    try { const r = await api.post(`/public/galleries/${token}/verify`, { password: pin }); setGallery(r.data); setProtectedGate(null); }
    catch { toast.error("Palavra-passe incorreta"); }
  };

  const action = async (pid, act) => {
    try { const r = await api.patch(`/public/galleries/${token}/photos/${pid}`, { action: act, pin }); setGallery(r.data); }
    catch { toast.error("Ação não permitida"); }
  };
  const sendComment = async (pid) => {
    if (!comment.trim()) return;
    const r = await api.post(`/public/galleries/${token}/photos/${pid}/comment`, { text: comment, author: gallery.client_name || "Cliente", pin });
    setGallery(r.data); setComment(""); toast.success("Comentário enviado");
  };

  const openBuy = (photo) => { setBuyPhoto(photo); setBuyProduct(""); setBuyQty(1); setBuyNotes(""); };
  const confirmAddToCart = () => {
    const p = products.find((x) => x.id === buyProduct);
    if (!p) return toast.error("Escolhe um produto");
    const qty = Math.max(1, Number(buyQty) || 1);
    setCart((c) => [...c, { product_id: p.id, name: p.name, price: p.price, quantity: qty, photo_name: buyPhoto?.name || "", photo_url: buyPhoto?.url || "", notes: buyNotes }]);
    toast.success("Adicionado ao carrinho");
    setBuyPhoto(null); setCartOpen(true);
  };
  const changeQty = (idx, delta) => setCart((c) => c.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it));
  const removeItem = (idx) => setCart((c) => c.filter((_, i) => i !== idx));
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  const openCheckout = () => {
    setCustomer((c) => ({ ...c, name: c.name || gallery?.client_name || "" }));
    setCheckoutOpen(true);
  };
  const finalizeOrder = async () => {
    if (cart.length === 0) return toast.error("Carrinho vazio");
    if (!customer.name.trim()) return toast.error("Indica o teu nome");
    setPlacing(true);
    try {
      await api.post(`/public/galleries/${token}/store-order`, {
        items: cart, customer_name: customer.name, customer_email: customer.email, customer_phone: customer.phone, notes: customer.notes,
      });
      toast.success("Pedido criado com sucesso!");
      setCart([]); setCheckoutOpen(false); setCartOpen(false); setCustomer({ name: "", email: "", phone: "", notes: "" });
    } catch { toast.error("Não foi possível finalizar o pedido"); }
    finally { setPlacing(false); }
  };

  const downloadSelected = () => {
    const sel = (gallery.photos || []).filter((p) => p.client_selected);
    if (!sel.length) return toast.error("Nenhuma foto selecionada");
    sel.forEach((p, i) => setTimeout(() => { const a = document.createElement("a"); a.href = p.url; a.download = p.name || `foto-${i}.jpg`; a.target = "_blank"; a.click(); }, i * 300));
    toast.success(`A transferir ${sel.length} foto(s)`);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (protectedGate) return (
    <div className="min-h-screen bg-background grain flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <Card className="p-8 border-border text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-accent flex items-center justify-center text-primary mb-5"><Lock className="h-7 w-7" /></div>
          <h1 className="font-display text-2xl font-light tracking-tight">{protectedGate.title}</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-6">Esta galeria está protegida. Introduza a palavra-passe.</p>
          <Input data-testid="gate-pin-input" type="password" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && verify()} placeholder="Palavra-passe" className="h-11 text-center" />
          <Button data-testid="gate-submit-btn" onClick={verify} className="w-full rounded-lg mt-4">Aceder</Button>
        </Card>
      </motion.div>
    </div>
  );

  if (!gallery) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Galeria indisponível.</div>;

  let photos = gallery.photos || [];
  let shown = photos;
  if (filter === "fav") shown = photos.filter((p) => p.client_favorite);
  if (filter === "selected") shown = photos.filter((p) => p.client_selected);
  if (filter === "featured") shown = photos.filter((p) => p.featured);
  const selectedCount = photos.filter((p) => p.client_selected).length;

  const buyBtn = (p, size = "sm") => (
    <Button size={size} data-testid={`lb-buy-${p.id}`} onClick={() => openBuy(p)} variant="outline" className="rounded-full gap-1.5"><ShoppingBag className="h-4 w-4" /> Adicionar produto</Button>
  );

  const actionBar = (photo) => {
    const p = photos.find((x) => x.id === photo.id) || photo;
    return (
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" data-testid={`lb-fav-${p.id}`} onClick={() => action(p.id, "favorite")} variant={p.client_favorite ? "default" : "outline"} className="rounded-full gap-1.5"><Heart className={`h-4 w-4 ${p.client_favorite ? "fill-current" : ""}`} /> Favorita</Button>
        <Button size="sm" data-testid={`lb-select-${p.id}`} onClick={() => action(p.id, "select")} variant={p.client_selected ? "default" : "outline"} className="rounded-full gap-1.5"><CheckCircle2 className="h-4 w-4" /> {p.client_selected ? "Selecionada" : "Álbum"}</Button>
        <Button size="sm" data-testid={`lb-approve-${p.id}`} onClick={() => action(p.id, "approve")} variant="outline" className="rounded-full gap-1.5 text-emerald-500"><CheckCircle2 className="h-4 w-4" /> Aprovar</Button>
        <Button size="sm" data-testid={`lb-reject-${p.id}`} onClick={() => action(p.id, "reject")} variant="outline" className="rounded-full gap-1.5 text-rose-500"><XCircle className="h-4 w-4" /> Rejeitar</Button>
        <Dialog>
          <DialogTrigger asChild><Button size="sm" variant="outline" className="rounded-full gap-1.5"><MessageSquare className="h-4 w-4" /> Comentar</Button></DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="font-display font-medium">Comentar fotografia</DialogTitle></DialogHeader>
            {p.comments?.length > 0 && <div className="space-y-2 max-h-40 overflow-y-auto">{p.comments.map((c, i) => <div key={i} className="text-sm bg-secondary rounded-lg p-2"><span className="font-medium">{c.author}: </span>{c.text}</div>)}</div>}
            <div className="flex gap-2 items-end"><Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Escreva um comentário..." className="min-h-[60px]" data-testid="comment-input" /><Button data-testid="comment-send" onClick={() => sendComment(p.id)} size="icon" className="h-11 w-11 rounded-lg"><Send className="h-4 w-4" /></Button></div>
          </DialogContent>
        </Dialog>
        {buyBtn(p)}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background grain">
      <header className="sticky top-0 z-30 h-16 border-b border-border backdrop-blur-xl bg-background/70 flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"><Aperture className="h-5 w-5" /></div>
          <div><p className="font-display font-semibold text-sm leading-tight">{gallery.title}</p><p className="text-[11px] text-muted-foreground">{gallery.client_name} · {photos.length} fotos</p></div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" data-testid="download-selected-btn" onClick={downloadSelected} className="rounded-lg gap-2"><Download className="h-4 w-4" /> <span className="hidden sm:inline">Selecionadas</span> ({selectedCount})</Button>
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild><Button size="sm" data-testid="cart-btn" className="rounded-lg gap-2"><ShoppingBag className="h-4 w-4" /> {itemCount}</Button></SheetTrigger>
            <SheetContent className="flex flex-col w-full sm:max-w-md">
              <SheetHeader><SheetTitle className="font-display font-medium">O teu carrinho</SheetTitle></SheetHeader>
              {cart.length === 0 ? <p className="text-sm text-muted-foreground py-10 text-center">Carrinho vazio.<br />Escolhe uma foto e adiciona um produto.</p> : (
                <>
                  <div className="flex-1 overflow-y-auto space-y-3 py-4" data-testid="cart-items">
                    {cart.map((it, i) => (
                      <div key={i} data-testid={`cart-item-${i}`} className="flex gap-3 border border-border rounded-xl p-3">
                        {it.photo_url ? <img src={it.photo_url} alt="" className="h-16 w-16 rounded-lg object-cover shrink-0" /> : <div className="h-16 w-16 rounded-lg bg-secondary shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm truncate">{it.name}</p>
                            <Button variant="ghost" size="icon" data-testid={`cart-remove-${i}`} onClick={() => removeItem(i)} className="h-7 w-7 -mt-1 -mr-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                          {it.photo_name && <p className="text-[11px] text-muted-foreground truncate">Foto: {it.photo_name}</p>}
                          {it.notes && <p className="text-[11px] text-muted-foreground italic truncate">"{it.notes}"</p>}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1.5">
                              <Button variant="outline" size="icon" data-testid={`cart-minus-${i}`} onClick={() => changeQty(i, -1)} className="h-7 w-7 rounded-full"><Minus className="h-3.5 w-3.5" /></Button>
                              <span className="w-6 text-center text-sm" data-testid={`cart-qty-${i}`}>{it.quantity}</span>
                              <Button variant="outline" size="icon" data-testid={`cart-plus-${i}`} onClick={() => changeQty(i, 1)} className="h-7 w-7 rounded-full"><Plus className="h-3.5 w-3.5" /></Button>
                            </div>
                            <span className="font-medium text-sm">{eur(it.price * it.quantity)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="flex justify-between text-sm text-muted-foreground"><span>Itens</span><span>{itemCount}</span></div>
                    <div className="flex justify-between font-display text-lg font-medium"><span>Subtotal</span><span data-testid="cart-subtotal">{eur(subtotal)}</span></div>
                    <Button data-testid="checkout-open-btn" onClick={openCheckout} className="w-full rounded-lg">Finalizar Pedido</Button>
                    <p className="text-[11px] text-muted-foreground text-center">Sem pagamento online — o estúdio contacta-te para tratar do pagamento.</p>
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-[1500px] mx-auto">
        <div className="flex flex-wrap gap-2 mb-6">
          {[["all", `Todas (${photos.length})`], ["featured", "Destaques"], ["fav", "Favoritas"], ["selected", `Álbum (${selectedCount})`]].map(([k, l]) => (
            <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} data-testid={`cg-filter-${k}`} onClick={() => setFilter(k)} className="rounded-full">{l}</Button>
          ))}
        </div>

        {photos.length === 0 ? (
          <Card className="p-16 border-dashed flex flex-col items-center text-center"><Sparkles className="h-10 w-10 text-muted-foreground mb-3" /><p className="font-display text-lg">As fotografias serão adicionadas em breve.</p></Card>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {shown.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}
                className="relative group break-inside-avoid rounded-xl overflow-hidden border border-border">
                <img src={p.url} alt={p.name} onClick={() => setLightbox(photos.indexOf(p))} className="w-full object-cover cursor-zoom-in" loading="lazy" />
                {gallery.watermark && <span className="absolute inset-0 flex items-center justify-center text-white/25 font-display text-2xl rotate-[-20deg] pointer-events-none">StudioHub AI</span>}
                <div className="absolute top-2 left-2 flex gap-1">{p.featured && <Badge className="rounded-full bg-amber-500 text-white border-0">Destaque</Badge>}</div>
                <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" data-testid={`grid-fav-${p.id}`} onClick={() => action(p.id, "favorite")} className={`h-8 w-8 bg-black/40 backdrop-blur text-white hover:text-rose-400 ${p.client_favorite ? "text-rose-400" : ""}`}><Heart className={`h-4 w-4 ${p.client_favorite ? "fill-current" : ""}`} /></Button>
                  <Button variant="ghost" size="icon" data-testid={`grid-select-${p.id}`} onClick={() => action(p.id, "select")} className={`h-8 w-8 bg-black/40 backdrop-blur text-white hover:text-primary ${p.client_selected ? "text-primary" : ""}`}><CheckCircle2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" data-testid={`grid-buy-${p.id}`} onClick={() => openBuy(p)} className="h-8 w-8 bg-black/40 backdrop-blur text-white hover:text-primary"><ShoppingBag className="h-4 w-4" /></Button>
                </div>
                {(p.client_favorite || p.client_selected) && <div className="absolute bottom-2 left-2 flex gap-1">{p.client_favorite && <span className="h-6 w-6 rounded-full bg-rose-500/90 flex items-center justify-center text-white"><Heart className="h-3 w-3 fill-current" /></span>}{p.client_selected && <span className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground"><CheckCircle2 className="h-3 w-3" /></span>}</div>}
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Modal: adicionar produto para uma foto */}
      <Dialog open={!!buyPhoto} onOpenChange={(o) => !o && setBuyPhoto(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display font-medium">Adicionar produto</DialogTitle></DialogHeader>
          {buyPhoto && (
            <div className="space-y-4 py-1">
              <img src={buyPhoto.url} alt={buyPhoto.name} className="w-full h-44 object-cover rounded-lg border border-border" />
              <div>
                <Label>Produto</Label>
                <Select value={buyProduct} onValueChange={setBuyProduct}>
                  <SelectTrigger data-testid="buy-product-select" className="h-11 mt-1.5"><SelectValue placeholder="Escolher produto..." /></SelectTrigger>
                  <SelectContent>{products.map((pr) => <SelectItem key={pr.id} value={pr.id}>{pr.name} — {eur(pr.price)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {buyProduct && <p className="text-sm text-muted-foreground">Preço unitário: <span className="font-medium text-foreground">{eur(products.find((x) => x.id === buyProduct)?.price || 0)}</span></p>}
              <div>
                <Label>Quantidade</Label>
                <Input type="number" min="1" data-testid="buy-qty-input" value={buyQty} onChange={(e) => setBuyQty(e.target.value)} className="h-11 mt-1.5 w-28" />
              </div>
              <div><Label>Observações</Label><Textarea data-testid="buy-notes-input" value={buyNotes} onChange={(e) => setBuyNotes(e.target.value)} className="mt-1.5" rows={2} placeholder="Ex: moldura preta, sem margem..." /></div>
            </div>
          )}
          <DialogFooter><Button data-testid="add-to-cart-confirm" onClick={confirmAddToCart} className="rounded-lg gap-2"><ShoppingBag className="h-4 w-4" /> Adicionar ao carrinho</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display font-medium">Finalizar pedido</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div><Label>Nome *</Label><Input data-testid="checkout-name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className="h-11 mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input data-testid="checkout-email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} className="h-11 mt-1.5" /></div>
              <div><Label>Telefone</Label><Input data-testid="checkout-phone" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className="h-11 mt-1.5" /></div>
            </div>
            <div><Label>Notas</Label><Textarea data-testid="checkout-notes" value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} className="mt-1.5" rows={2} /></div>
            <div className="flex items-center justify-between font-display text-lg font-medium pt-2 border-t border-border"><span>Total</span><span data-testid="checkout-total">{eur(subtotal)}</span></div>
            <p className="text-[11px] text-muted-foreground">Sem pagamento online nesta fase — o estúdio recebe o pedido e trata do pagamento contigo.</p>
          </div>
          <DialogFooter><Button data-testid="finalize-order-btn" disabled={placing} onClick={finalizeOrder} className="rounded-lg w-full">{placing ? "A processar..." : "Finalizar Pedido"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {lightbox >= 0 && <Lightbox photos={photos} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(-1)} watermark={gallery.watermark} renderActions={actionBar} />}
    </div>
  );
}
