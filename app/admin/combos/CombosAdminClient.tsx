"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search, X, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils-format";
import { computeComboPricing, COMBO_MIN_ITEMS, COMBO_MAX_ITEMS } from "@/lib/combos";

/* ─── Types ─── */

type ComboPriceType = "FIXED" | "PERCENTAGE_DISCOUNT";

export type ComboDTO = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  stock: number;
  priceType: ComboPriceType;
  priceValue: number;
  isActive: boolean;
  createdAt: string;
  items: {
    id: string;
    productId: string;
    quantity: number;
    product: { id: string; name: string; slug: string; image: string | null; price: number };
  }[];
};

export type ProductOptionDTO = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  price: number;
};

interface SelectedItem {
  productId: string;
  quantity: number;
}

interface ComboFormData {
  name: string;
  slug: string;
  description: string;
  imageFile: File | null;
  stock: string;
  priceType: ComboPriceType;
  priceValue: string;
  isActive: boolean;
  selectedItems: SelectedItem[];
}

interface Props {
  combos: ComboDTO[];
  products: ProductOptionDTO[];
}

/* ─── Helpers ─── */

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const emptyFormData: ComboFormData = {
  name: "",
  slug: "",
  description: "",
  imageFile: null,
  stock: "0",
  priceType: "FIXED",
  priceValue: "",
  isActive: true,
  selectedItems: [],
};

export function CombosAdminClient({ combos, products }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<ComboDTO | null>(null);
  const [formData, setFormData] = useState<ComboFormData>(emptyFormData);
  const [productSearch, setProductSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const productsById = useMemo(() => {
    const map = new Map<string, ProductOptionDTO>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    const base = term
      ? products.filter((p) => p.name.toLowerCase().includes(term))
      : products;
    return base.slice(0, 30);
  }, [products, productSearch]);

  const componentsTotalCents = useMemo(() => {
    return formData.selectedItems.reduce((sum, item) => {
      const product = productsById.get(item.productId);
      if (!product) return sum;
      return sum + product.price * item.quantity;
    }, 0);
  }, [formData.selectedItems, productsById]);

  const priceValueNumber = Number(formData.priceValue.replace(",", "."));
  const pricingPreview =
    Number.isFinite(priceValueNumber) && priceValueNumber > 0 && formData.selectedItems.length > 0
      ? computeComboPricing({
          priceType: formData.priceType,
          priceValue:
            formData.priceType === "FIXED" ? Math.round(priceValueNumber * 100) : priceValueNumber,
          componentsTotalCents,
        })
      : null;

  function openCreateDialog() {
    setEditingCombo(null);
    setFormData(emptyFormData);
    setProductSearch("");
    setDialogOpen(true);
  }

  function openEditDialog(combo: ComboDTO) {
    setEditingCombo(combo);
    setFormData({
      name: combo.name,
      slug: combo.slug,
      description: combo.description ?? "",
      imageFile: null,
      stock: String(combo.stock),
      priceType: combo.priceType,
      priceValue:
        combo.priceType === "FIXED"
          ? String(combo.priceValue / 100)
          : String(combo.priceValue),
      isActive: combo.isActive,
      selectedItems: combo.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    });
    setProductSearch("");
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingCombo(null);
    setFormData(emptyFormData);
  }

  function toggleProduct(productId: string) {
    setFormData((prev) => {
      const exists = prev.selectedItems.some((i) => i.productId === productId);
      if (exists) {
        return {
          ...prev,
          selectedItems: prev.selectedItems.filter((i) => i.productId !== productId),
        };
      }
      if (prev.selectedItems.length >= COMBO_MAX_ITEMS) {
        toast.error(`Máximo ${COMBO_MAX_ITEMS} productos por combo`);
        return prev;
      }
      return {
        ...prev,
        selectedItems: [...prev.selectedItems, { productId, quantity: 1 }],
      };
    });
  }

  function setItemQuantity(productId: string, quantity: number) {
    setFormData((prev) => ({
      ...prev,
      selectedItems: prev.selectedItems.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.max(1, Math.floor(quantity) || 1) } : i
      ),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (formData.selectedItems.length < COMBO_MIN_ITEMS) {
      toast.error(`Un combo debe tener al menos ${COMBO_MIN_ITEMS} productos`);
      return;
    }
    if (formData.selectedItems.length > COMBO_MAX_ITEMS) {
      toast.error(`Un combo no puede tener más de ${COMBO_MAX_ITEMS} productos`);
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("slug", formData.slug);
      fd.append("description", formData.description || "");
      fd.append("stock", formData.stock || "0");
      fd.append("priceType", formData.priceType);
      fd.append("priceValue", formData.priceValue || "0");
      fd.append("isActive", String(formData.isActive));
      fd.append("items", JSON.stringify(formData.selectedItems));
      if (formData.imageFile) fd.append("image", formData.imageFile);

      const response = editingCombo
        ? await fetch(`/api/admin/combos/${editingCombo.id}`, { method: "PATCH", body: fd })
        : await fetch("/api/admin/combos", { method: "POST", body: fd });

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Error al guardar el combo");

      toast.success(editingCombo ? "Combo actualizado" : "Combo creado");
      closeDialog();
      router.refresh();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error al guardar el combo";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(combo: ComboDTO) {
    if (!confirm(`¿Desactivar "${combo.name}"? No se elimina físicamente.`)) return;
    try {
      const res = await fetch(`/api/admin/combos/${combo.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Error al desactivar el combo");
      }
      toast.success("Combo desactivado");
      router.refresh();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error al desactivar el combo";
      toast.error(msg);
    }
  }

  async function handleToggleActive(combo: ComboDTO) {
    try {
      const fd = new FormData();
      fd.append("isActive", String(!combo.isActive));
      const res = await fetch(`/api/admin/combos/${combo.id}`, { method: "PATCH", body: fd });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Error al cambiar el estado");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Combos</h1>
          <p className="text-sm text-muted-foreground">
            Armá combos de 2 a {COMBO_MAX_ITEMS} productos con precio fijo o descuento.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => (open ? openCreateDialog() : closeDialog())}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo combo
            </Button>
          </DialogTrigger>

          <DialogContent className="bg-card text-foreground border-border max-w-3xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {editingCombo ? "Editar combo" : "Nuevo combo"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="combo-name">Nombre</Label>
                  <Input
                    id="combo-name"
                    required
                    value={formData.name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData((p) => ({ ...p, name: v, slug: generateSlug(v) }));
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="combo-slug">Slug</Label>
                  <Input
                    id="combo-slug"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="combo-description">Descripción</Label>
                <Textarea
                  id="combo-description"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="combo-priceType">Tipo de precio</Label>
                  <select
                    id="combo-priceType"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={formData.priceType}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        priceType: e.target.value as ComboPriceType,
                        priceValue: "",
                      }))
                    }
                  >
                    <option value="FIXED">Precio fijo</option>
                    <option value="PERCENTAGE_DISCOUNT">Descuento %</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="combo-priceValue">
                    {formData.priceType === "FIXED" ? "Precio final (ARS)" : "Descuento (%)"}
                  </Label>
                  <Input
                    id="combo-priceValue"
                    required
                    type="number"
                    min="0"
                    max={formData.priceType === "PERCENTAGE_DISCOUNT" ? "100" : undefined}
                    step="0.01"
                    value={formData.priceValue}
                    onChange={(e) => setFormData((p) => ({ ...p, priceValue: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="combo-stock">Stock</Label>
                  <Input
                    id="combo-stock"
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={formData.stock}
                    onChange={(e) => setFormData((p) => ({ ...p, stock: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="combo-image">Imagen</Label>
                <Input
                  id="combo-image"
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/avif"
                  onChange={(e) => setFormData((p) => ({ ...p, imageFile: e.target.files?.[0] ?? null }))}
                />
                {editingCombo?.imageUrl && !formData.imageFile && (
                  <div className="relative h-20 w-20 mt-2 rounded overflow-hidden border border-border">
                    <Image src={editingCombo.imageUrl} alt={editingCombo.name} fill className="object-cover" />
                  </div>
                )}
              </div>

              {/* Selector de productos */}
              <div className="space-y-2">
                <Label>
                  Productos del combo ({formData.selectedItems.length}/{COMBO_MAX_ITEMS}, mínimo{" "}
                  {COMBO_MIN_ITEMS})
                </Label>

                {formData.selectedItems.length > 0 && (
                  <div className="space-y-2 rounded-md border border-border p-2">
                    {formData.selectedItems.map((item) => {
                      const product = productsById.get(item.productId);
                      if (!product) return null;
                      return (
                        <div key={item.productId} className="flex items-center gap-2">
                          <span className="flex-1 text-sm truncate">{product.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatPrice(product.price)}
                          </span>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            className="w-16 h-8"
                            value={item.quantity}
                            onChange={(e) => setItemQuantity(item.productId, Number(e.target.value))}
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => toggleProduct(item.productId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Buscar producto para agregar..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>

                <div className="max-h-40 overflow-y-auto rounded-md border border-border divide-y divide-border">
                  {filteredProducts.map((product) => {
                    const selected = formData.selectedItems.some((i) => i.productId === product.id);
                    return (
                      <button
                        type="button"
                        key={product.id}
                        onClick={() => toggleProduct(product.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${
                          selected ? "bg-primary/10" : ""
                        }`}
                      >
                        <span className="flex-1 truncate">{product.name}</span>
                        <span className="text-xs text-muted-foreground">{formatPrice(product.price)}</span>
                        {selected && <Badge className="text-[10px]">Agregado</Badge>}
                      </button>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</p>
                  )}
                </div>
              </div>

              {/* Preview de ahorro */}
              {pricingPreview && (
                <Card className="p-3 bg-muted/40 border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Suma de productos</span>
                    <span>{formatPrice(componentsTotalCents)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>Precio del combo</span>
                    <span>{formatPrice(pricingPreview.finalPriceCents)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-primary">
                    <span>Ahorro para el cliente</span>
                    <span>{formatPrice(pricingPreview.savingsCents)}</span>
                  </div>
                </Card>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="combo-isActive">Activo</Label>
                <Switch
                  id="combo-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData((p) => ({ ...p, isActive: checked }))}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Guardando..." : editingCombo ? "Guardar cambios" : "Crear combo"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {combos.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <PackagePlus className="h-10 w-10 mx-auto mb-2 opacity-50" />
          Todavía no hay combos creados.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {combos.map((combo) => {
            const componentsTotal = combo.items.reduce(
              (sum, i) => sum + i.product.price * i.quantity,
              0
            );
            const { finalPriceCents, savingsCents } = computeComboPricing({
              priceType: combo.priceType,
              priceValue: combo.priceValue,
              componentsTotalCents: componentsTotal,
            });

            return (
              <Card key={combo.id} className="overflow-hidden border-border">
                <div className="relative h-36 bg-muted">
                  {combo.imageUrl ? (
                    <Image src={combo.imageUrl} alt={combo.name} fill className="object-cover" />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <PackagePlus className="h-10 w-10" />
                    </div>
                  )}
                  {!combo.isActive && (
                    <Badge className="absolute top-2 left-2 bg-muted-foreground text-background">
                      Inactivo
                    </Badge>
                  )}
                  {combo.stock <= 0 && (
                    <Badge className="absolute top-2 right-2 bg-blood text-white">Agotado</Badge>
                  )}
                </div>

                <div className="p-3 space-y-2">
                  <h3 className="font-semibold text-sm">{combo.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {combo.items.map((i) => i.product.name).join(", ")}
                  </p>

                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold">{formatPrice(finalPriceCents)}</span>
                    {savingsCents > 0 && (
                      <span className="text-xs text-primary">Ahorra {formatPrice(savingsCents)}</span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">Stock: {combo.stock}</p>

                  <div className="flex items-center justify-between pt-1">
                    <Switch checked={combo.isActive} onCheckedChange={() => handleToggleActive(combo)} />
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEditDialog(combo)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(combo)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
