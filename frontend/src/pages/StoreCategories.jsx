import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Search, Tags } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const emptyForm = { name: "", description: "", active: true };

export default function StoreCategories() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => api.get("/store/categories").then((r) => setCategories(r.data));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, description: c.description || "", active: c.active !== false }); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) return toast.error("O nome é obrigatório");
    if (editing) { await api.put(`/store/categories/${editing.id}`, form); toast.success("Categoria atualizada"); }
    else { await api.post("/store/categories", form); toast.success("Categoria criada"); }
    setOpen(false); load();
  };

  const toggle = async (c) => { await api.patch(`/store/categories/${c.id}/toggle`); load(); };
  const remove = async (id) => { await api.delete(`/store/categories/${id}`); toast.success("Categoria removida"); load(); };

  const filtered = categories.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (c.name || "").toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input data-testid="category-search" placeholder="Pesquisar categorias..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 pl-9" />
        </div>
        <Button data-testid="add-category-btn" onClick={openCreate} className="rounded-lg gap-2 hover:-translate-y-0.5 transition-transform"><Plus className="h-4 w-4" /> Nova categoria</Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-16 border-dashed flex flex-col items-center text-center">
          <Tags className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-display text-lg">Sem categorias</p>
        </Card>
      ) : (
        <Card className="border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} data-testid={`category-row-${c.id}`} className="group">
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.description || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch data-testid={`category-toggle-${c.id}`} checked={c.active !== false} onCheckedChange={() => toggle(c)} />
                      <Badge variant="outline" className={`rounded-full text-xs ${c.active !== false ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" : "text-muted-foreground"}`}>{c.active !== false ? "Ativa" : "Inativa"}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" data-testid={`edit-category-${c.id}`} onClick={() => openEdit(c)} className="h-8 w-8 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" data-testid={`delete-category-${c.id}`} onClick={() => remove(c.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display font-medium">{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Nome *</Label><Input data-testid="category-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 mt-1.5" /></div>
            <div><Label>Descrição</Label><Textarea data-testid="category-description-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={2} /></div>
            <div className="flex items-center gap-3">
              <Switch data-testid="category-active-switch" checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <span className="text-sm">{form.active ? "Ativa" : "Inativa"}</span>
            </div>
          </div>
          <DialogFooter><Button data-testid="save-category-btn" onClick={save} className="rounded-lg">Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
