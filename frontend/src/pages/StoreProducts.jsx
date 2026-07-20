import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Pencil, Search, ShoppingBag, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { api, eur } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const emptyForm = { name: "", description: "", category: "", price: "", image_url: "", sku: "", active: true };

export default function StoreProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    api.get("/store/products").then((r) => setProducts(r.data));
    api.get("/store/categories").then((r) => setCategories(r.data));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || "", category: p.category || "", price: p.price, image_url: p.image_url || "", sku: p.sku || "", active: p.active });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("O nome do produto é obrigatório");
    if (!(Number(form.price) >= 0)) return toast.error("O preço não pode ser negativo");
    const payload = { name: form.name, description: form.description, category: form.category, price: Number(form.price) || 0, image_url: form.image_url, sku: form.sku, active: form.active };
    if (editing) { await api.put(`/store/products/${editing.id}`, payload); toast.success("Produto atualizado"); }
    else { await api.post("/store/products", payload); toast.success("Produto criado"); }
    setOpen(false); load();
  };

  const toggle = async (p) => { await api.patch(`/store/products/${p.id}/toggle`); load(); };
  const remove = async (id) => { await api.delete(`/store/products/${id}`); toast.success("Produto removido"); load(); };

  const filtered = products
    .filter((p) => catFilter === "todas" || p.category === catFilter)
    .filter((p) => statusFilter === "todos" || (statusFilter === "ativo" ? p.active : !p.active))
    .filter((p) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (p.name || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input data-testid="store-search" placeholder="Pesquisar produtos (nome, SKU, categoria)..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 pl-9" />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger data-testid="store-category-filter" className="h-10 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger data-testid="store-status-filter" className="h-10 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Button data-testid="add-product-btn" onClick={openCreate} className="rounded-lg gap-2 hover:-translate-y-0.5 transition-transform"><Plus className="h-4 w-4" /> Novo produto</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-16 border-dashed flex flex-col items-center text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-display text-lg">Sem produtos</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card data-testid={`product-card-${p.id}`} className={`overflow-hidden border-border group ${!p.active ? "opacity-70" : ""}`}>
                <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageOff className="h-8 w-8" /></div>
                  )}
                  <Badge className={`absolute top-3 left-3 rounded-full text-[10px] ${p.active ? "bg-emerald-500/90" : "bg-muted text-muted-foreground"}`}>{p.active ? "Ativo" : "Inativo"}</Badge>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {p.category && <Badge variant="secondary" className="rounded-full text-[10px] font-normal">{p.category}</Badge>}
                        {p.sku && <span className="text-[10px] text-muted-foreground font-mono">{p.sku}</span>}
                      </div>
                    </div>
                    <p className="font-display font-medium whitespace-nowrap">{eur(p.price)}</p>
                  </div>
                  {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <Switch data-testid={`product-toggle-${p.id}`} checked={p.active} onCheckedChange={() => toggle(p)} />
                      <span className="text-xs text-muted-foreground">{p.active ? "Visível" : "Oculto"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" data-testid={`edit-product-${p.id}`} onClick={() => openEdit(p)} className="h-8 w-8 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" data-testid={`delete-product-${p.id}`} onClick={() => remove(p.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display font-medium">{editing ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Nome *</Label><Input data-testid="product-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 mt-1.5" /></div>
            <div><Label>Descrição</Label><Textarea data-testid="product-description-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select value={form.category || "none"} onValueChange={(v) => setForm({ ...form, category: v === "none" ? "" : v })}>
                  <SelectTrigger data-testid="product-category-select" className="h-11 mt-1.5"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sem categoria —</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>SKU</Label><Input data-testid="product-sku-input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="h-11 mt-1.5" placeholder="Ex: CAN-4060" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Preço (€) *</Label><Input type="number" min="0" step="0.01" data-testid="product-price-input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="h-11 mt-1.5" /></div>
              <div className="flex items-center gap-3 pt-7">
                <Switch data-testid="product-active-switch" checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <span className="text-sm">{form.active ? "Ativo" : "Inativo"}</span>
              </div>
            </div>
            <div><Label>URL da imagem</Label><Input data-testid="product-image-input" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="h-11 mt-1.5" placeholder="https://..." /></div>
            {form.image_url && <img src={form.image_url} alt="pré-visualização" className="w-full h-40 object-cover rounded-lg border border-border" />}
          </div>
          <DialogFooter><Button data-testid="save-product-btn" onClick={save} className="rounded-lg">Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
