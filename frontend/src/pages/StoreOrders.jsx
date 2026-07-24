import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Search, Package, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { api, eur, fmtDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATES = [
  { value: "novo", label: "Novo", cls: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
  { value: "pago", label: "Pago", cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  { value: "em_producao", label: "Em Produção", cls: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  { value: "enviado", label: "Enviado", cls: "bg-sky-500/10 text-sky-500 border-sky-500/20" },
  { value: "entregue", label: "Entregue", cls: "bg-violet-500/10 text-violet-500 border-violet-500/20" },
  { value: "cancelado", label: "Cancelado", cls: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
];
const stMap = Object.fromEntries(STATES.map((s) => [s.value, s]));
const PAYMENT = {
  pending: { label: "Pendente", cls: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  paid: { label: "Pago", cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  failed: { label: "Falhou", cls: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
  refunded: { label: "Reembolsado", cls: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
};
const emptyForm = { customer_name: "", customer_email: "", notes: "", status: "novo", items: [] };

export default function StoreOrders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [newItem, setNewItem] = useState({ product: "", quantity: 1 });

  const load = () => api.get("/store/orders").then((r) => setOrders(r.data));
  useEffect(() => {
    load();
    api.get("/store/products?active=true").then((r) => setProducts(r.data)).catch(() => {});
  }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setNewItem({ product: "", quantity: 1 }); setOpen(true); };
  const openEdit = (o) => { setEditing(o); setForm({ customer_name: o.customer_name || "", customer_email: o.customer_email || "", notes: o.notes || "", status: o.status, items: o.items || [] }); setNewItem({ product: "", quantity: 1 }); setOpen(true); };

  const addItem = () => {
    const p = products.find((x) => x.id === newItem.product);
    if (!p) return toast.error("Escolhe um produto");
    const qty = Math.max(1, Number(newItem.quantity) || 1);
    setForm((f) => ({ ...f, items: [...f.items, { product_id: p.id, name: p.name, price: p.price, quantity: qty }] }));
    setNewItem({ product: "", quantity: 1 });
  };
  const removeItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const formTotal = form.items.reduce((s, i) => s + i.price * i.quantity, 0);

  const save = async () => {
    if (form.items.length === 0) return toast.error("Adiciona pelo menos um item");
    const payload = { customer_name: form.customer_name, customer_email: form.customer_email, notes: form.notes, status: form.status, items: form.items };
    if (editing) { await api.put(`/store/orders/${editing.id}`, payload); toast.success("Pedido atualizado"); }
    else { await api.post("/store/orders", payload); toast.success("Pedido criado"); }
    setOpen(false); load();
  };

  const setStatus = async (o, status) => { await api.patch(`/store/orders/${o.id}/status`, { status }); toast.success("Estado atualizado"); load(); };
  const remove = async (id) => { await api.delete(`/store/orders/${id}`); toast.success("Pedido removido"); load(); };

  const filtered = orders
    .filter((o) => filter === "todos" || o.status === filter)
    .filter((o) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (o.number || "").toLowerCase().includes(q) || (o.customer_name || "").toLowerCase().includes(q) || (o.customer_email || "").toLowerCase().includes(q);
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input data-testid="orders-search" placeholder="Pesquisar por nº, cliente ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 pl-9" />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger data-testid="orders-filter" className="h-10 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os estados</SelectItem>
              {STATES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button data-testid="add-order-btn" onClick={openCreate} className="rounded-lg gap-2 hover:-translate-y-0.5 transition-transform"><Plus className="h-4 w-4" /> Novo pedido</Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-16 border-dashed flex flex-col items-center text-center">
          <Package className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-display text-lg">Sem pedidos</p>
        </Card>
      ) : (
        <Card className="border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nº</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => {
                const st = stMap[o.status] || STATES[0];
                return (
                  <TableRow key={o.id} data-testid={`order-row-${o.id}`} className="group">
                    <TableCell className="font-mono text-sm">{o.number}</TableCell>
                    <TableCell className="font-medium">{o.customer_name || "—"}<div className="text-xs text-muted-foreground font-normal">{o.customer_email}</div></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(o.items || []).reduce((s, i) => s + (i.quantity || 1), 0)} un.</TableCell>
                    <TableCell className="text-right font-display font-medium">{eur(o.total)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{fmtDate(o.created_at)}</TableCell>
                    <TableCell>
                      <Select value={o.status} onValueChange={(v) => setStatus(o, v)}>
                        <SelectTrigger data-testid={`order-status-${o.id}`} className={`h-8 w-36 rounded-full border text-xs ${st.cls}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{STATES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" data-testid={`view-order-${o.id}`} onClick={() => setViewing(o)} className="h-8 w-8 text-muted-foreground hover:text-primary"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" data-testid={`edit-order-${o.id}`} onClick={() => openEdit(o)} className="h-8 w-8 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" data-testid={`delete-order-${o.id}`} onClick={() => remove(o.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display font-medium">{editing ? `Editar pedido ${editing.number}` : "Novo pedido"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Cliente</Label><Input data-testid="order-customer-input" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="h-11 mt-1.5" /></div>
              <div><Label>Email</Label><Input data-testid="order-email-input" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} className="h-11 mt-1.5" /></div>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger data-testid="order-status-select" className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>{STATES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Itens</Label>
              <div className="space-y-2 mt-1.5">
                {form.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm border border-border rounded-lg px-3 py-2">
                    <span>{it.quantity}× {it.name}</span>
                    <div className="flex items-center gap-2"><span className="font-medium">{eur(it.price * it.quantity)}</span>
                      <Button variant="ghost" size="icon" data-testid={`remove-order-item-${idx}`} onClick={() => removeItem(idx)} className="h-7 w-7 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Select value={newItem.product} onValueChange={(v) => setNewItem({ ...newItem, product: v })}>
                    <SelectTrigger data-testid="order-product-select" className="h-10 flex-1"><SelectValue placeholder="Escolher produto..." /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {eur(p.price)}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" min="1" data-testid="order-item-qty" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} className="h-10 w-16" />
                  <Button variant="outline" data-testid="add-order-item-btn" onClick={addItem} className="h-10 rounded-lg gap-1"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
            <div><Label>Observações</Label><Textarea data-testid="order-notes-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5" rows={2} /></div>
            <div className="flex items-center justify-between font-display text-lg font-medium pt-2 border-t border-border"><span>Total</span><span data-testid="order-total">{eur(formTotal)}</span></div>
          </div>
          <DialogFooter><Button data-testid="save-order-btn" onClick={save} className="rounded-lg">Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhe do pedido (read-only) */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display font-medium">{viewing?.number}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-4 py-1 max-h-[70vh] overflow-y-auto" data-testid="order-detail">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Cliente</p><p className="font-medium">{viewing.customer_name || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Estado operacional</p><Badge variant="outline" className={`rounded-full text-xs ${(stMap[viewing.status] || STATES[0]).cls}`}>{(stMap[viewing.status] || STATES[0]).label}</Badge></div>
                <div><p className="text-xs text-muted-foreground">Email</p><p>{viewing.customer_email || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Telefone</p><p>{viewing.customer_phone || "—"}</p></div>
                <div data-testid="order-payment-status"><p className="text-xs text-muted-foreground">Pagamento</p><Badge variant="outline" className={`rounded-full text-xs ${(PAYMENT[viewing.payment_status] || PAYMENT.pending).cls}`}>{(PAYMENT[viewing.payment_status] || PAYMENT.pending).label}</Badge></div>
                <div><p className="text-xs text-muted-foreground">Data de pagamento</p><p>{viewing.paid_at ? fmtDate(viewing.paid_at) : "—"}</p></div>
                {viewing.gallery_title && <div className="col-span-2"><p className="text-xs text-muted-foreground">Galeria</p><p>{viewing.gallery_title}</p></div>}
                {viewing.stripe_session_id && <div className="col-span-2"><p className="text-xs text-muted-foreground">Stripe Session ID</p><p className="font-mono text-[11px] break-all" data-testid="order-stripe-session">{viewing.stripe_session_id}</p></div>}
              </div>

              {viewing.photos?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Fotos compradas ({viewing.photos.length})</p>
                  <div className="flex gap-2 flex-wrap" data-testid="order-photos">
                    {viewing.photos.map((ph, i) => <img key={i} src={ph.url} alt={ph.name} title={ph.name} className="h-16 w-16 rounded-lg object-cover border border-border" />)}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Produtos</p>
                <div className="space-y-2">
                  {(viewing.items || []).map((it, i) => (
                    <div key={i} className="flex items-center gap-3 border border-border rounded-lg p-2.5 text-sm">
                      {it.photo_url && <img src={it.photo_url} alt="" className="h-10 w-10 rounded object-cover shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{it.quantity}× {it.name}</p>
                        {it.notes && <p className="text-[11px] text-muted-foreground italic truncate">"{it.notes}"</p>}
                      </div>
                      <span className="font-medium whitespace-nowrap">{eur(it.price * it.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {viewing.notes && <div><p className="text-xs text-muted-foreground">Observações</p><p className="text-sm">{viewing.notes}</p></div>}

              {viewing.history?.length > 0 && (
                <div data-testid="order-history">
                  <p className="text-xs text-muted-foreground mb-1.5">Histórico do pedido</p>
                  <div className="space-y-2 border-l-2 border-border pl-3">
                    {viewing.history.map((h, i) => (
                      <div key={i} className="relative">
                        <span className="absolute -left-[15px] top-1 h-2 w-2 rounded-full bg-primary" />
                        <p className="text-sm leading-tight">{h.message}</p>
                        <p className="text-[10px] text-muted-foreground">{fmtDate(h.ts)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between font-display text-lg font-medium pt-2 border-t border-border"><span>Total</span><span>{eur(viewing.total)}</span></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
