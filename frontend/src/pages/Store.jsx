import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import StoreProducts from "./StoreProducts";
import StoreCategories from "./StoreCategories";
import StoreOrders from "./StoreOrders";

export default function Store() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-medium">Loja Online</h2>
        <p className="text-sm text-muted-foreground mt-1">Gere produtos, categorias e pedidos da tua loja.</p>
      </div>
      <Tabs defaultValue="produtos">
        <TabsList data-testid="store-tabs">
          <TabsTrigger value="produtos" data-testid="tab-produtos">Produtos</TabsTrigger>
          <TabsTrigger value="categorias" data-testid="tab-categorias">Categorias</TabsTrigger>
          <TabsTrigger value="pedidos" data-testid="tab-pedidos">Pedidos</TabsTrigger>
        </TabsList>
        <TabsContent value="produtos" className="mt-6"><StoreProducts /></TabsContent>
        <TabsContent value="categorias" className="mt-6"><StoreCategories /></TabsContent>
        <TabsContent value="pedidos" className="mt-6"><StoreOrders /></TabsContent>
      </Tabs>
    </div>
  );
}
