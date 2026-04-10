"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Plus, Edit, Trash2, Star, Copy, Search } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { formatPrice } from "@/lib/utils-format";
import { computeUnitPrice } from "@/lib/unitPrice";
import { AdminProductFilters } from "./AdminProductFilters";
import { AdminPagination } from "./AdminPagination";

/* ─── Types ─── */

type UnitType = "PER_KG" | "PER_UNIT";

export type ProductDTO = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  categoryId: string;
  image: string | null;
  stock: number;
  unitType: UnitType;
  vatRate: number | null;
  isOnSale: boolean;
  salePrice: number | null;
  saleEndDate: string | null;
  discountPercent: number | null;
  isFeatured: boolean;
  isActive: boolean;
  measurementUnit: string;
  unitMultiplier: number;
  brand: string | null;
  minPurchaseQty: number | null;
  qtyStep: number | null;
  maxPurchaseQty: number | null;
  allowsDecimals: boolean;
  netWeightGr: number | null;
  netVolumeMl: number | null;
  createdAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
    vatRate: number | null;
    parentId: string | null;
  };
};

export type CategoryDTO = {
  id: string;
  name: string;
  slug: string;
  vatRate: number | null;
  parentId: string | null;
};

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  price: string;
  categoryId: string;
  imageFile: File | null;
  stock: string;
  unitType: UnitType;
  vatRate: "" | "0.21" | "0.105";
  isOnSale: boolean;
  salePrice: string;
  saleEndDate: string;
  minPurchaseQty: string;
  qtyStep: string;
  maxPurchaseQty: string;
  allowsDecimals: boolean;
  measurementUnit: string;
  unitMultiplier: string;
  brand: string;
  isFeatured: boolean;
  isActive: boolean;
}

interface Props {
  products: ProductDTO[];
  total: number;
  categories: CategoryDTO[];
  brands: string[];
  currentPage: number;
  pageSize: number;
  hasFilters: boolean;
  searchTerm: string;
}

/* ─── Helpers ─── */

function deriveUnitType(measurementUnit: string): UnitType {
  return measurementUnit === "kg" ? "PER_KG" : "PER_UNIT";
}

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toDatetimeLocalValue(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const formatVatLabel = (vatRate?: number | null) => {
  if (vatRate === 0.105) return "10,5%";
  if (vatRate === 0.21) return "21%";
  return "—";
};

function getOfferRuleText(product: ProductDTO) {
  if (!product.isOnSale) return null;
  const min = Number(product.minPurchaseQty ?? 0);
  const step = Number(product.qtyStep ?? 0);
  if (product.unitType === "PER_KG" && min > 0) {
    return `Promo x ${min} kg${step > 0 ? ` · suma de a ${step} kg` : ""}`;
  }
  if (product.unitType === "PER_UNIT" && min > 0) {
    return `Promo x ${min} un${step > 0 ? ` · suma de a ${step} un` : ""}`;
  }
  return null;
}

const unitLabelFor = (unitType: UnitType) =>
  unitType === "PER_KG" ? "kg" : "unid.";

const emptyFormData: ProductFormData = {
  name: "",
  slug: "",
  description: "",
  price: "",
  categoryId: "",
  imageFile: null,
  stock: "0",
  unitType: "PER_KG",
  vatRate: "",
  isOnSale: false,
  salePrice: "",
  saleEndDate: "",
  minPurchaseQty: "",
  qtyStep: "",
  maxPurchaseQty: "",
  allowsDecimals: false,
  measurementUnit: "un",
  unitMultiplier: "1",
  brand: "",
  isFeatured: false,
  isActive: true,
};

/* ─── Component ─── */

export function ProductosAdminClient({
  products: initialProducts,
  total,
  categories,
  brands,
  currentPage,
  pageSize,
  hasFilters,
  searchTerm,
}: Props) {
  const router = useRouter();

  // Productos con soporte para updates optimistas
  const [products, setProducts] = useState<ProductDTO[]>(initialProducts);
  const prevRef = useRef(initialProducts);
  useEffect(() => {
    if (prevRef.current !== initialProducts) {
      prevRef.current = initialProducts;
      setProducts(initialProducts);
    }
  }, [initialProducts]);

  // Dialog / form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDTO | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyFormData);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Reabrir modal tras crear nueva categoría
  useEffect(() => {
    const flag = sessionStorage.getItem("reopenProductModal");
    if (flag === "1") {
      sessionStorage.removeItem("reopenProductModal");
      setEditingProduct(null);
      setFormData(emptyFormData);
      setPreviewUrl(null);
      setDialogOpen(true);
    }
  }, []);

  const goCreateCategory = () => {
    sessionStorage.setItem("reopenProductModal", "1");
    setDialogOpen(false);
    router.push("/admin/categorias");
  };

  /* ─── Form helpers ─── */

  const stockStep = useMemo(
    () => (formData.unitType === "PER_KG" ? "0.01" : "1"),
    [formData.unitType]
  );
  const stockLabel = useMemo(
    () => (formData.unitType === "PER_KG" ? "kg" : "unidades"),
    [formData.unitType]
  );
  const quantityStepInput = useMemo(() => {
    if (formData.unitType === "PER_UNIT") return "1";
    return formData.allowsDecimals ? "0.1" : "1";
  }, [formData.unitType, formData.allowsDecimals]);

  const selectedCategoryVat = useMemo(() => {
    const cat = categories.find((c) => c.id === formData.categoryId);
    return cat?.vatRate ?? null;
  }, [categories, formData.categoryId]);

  const effectiveVatPreview = useMemo(() => {
    if (formData.vatRate === "0.21") return 0.21;
    if (formData.vatRate === "0.105") return 0.105;
    return selectedCategoryVat ?? null;
  }, [formData.vatRate, selectedCategoryVat]);

  const unitPricePreview = useMemo(() => {
    const priceCents = Math.round(Number(formData.price) * 100);
    if (!priceCents || !Number.isFinite(priceCents)) return null;
    const multiplier = Number(formData.unitMultiplier);
    if (!Number.isFinite(multiplier) || multiplier <= 0) return null;
    const effectivePrice =
      formData.isOnSale && formData.salePrice
        ? Math.round(Number(formData.salePrice) * 100)
        : priceCents;
    return computeUnitPrice(effectivePrice, formData.measurementUnit, multiplier);
  }, [formData.price, formData.salePrice, formData.isOnSale, formData.measurementUnit, formData.unitMultiplier]);

  const offerPreviewText = useMemo(() => {
    if (!formData.isOnSale) return null;
    const min = Number(formData.minPurchaseQty);
    const step = Number(formData.qtyStep);
    if (!Number.isFinite(min) || min <= 0) return null;
    if (formData.unitType === "PER_KG") {
      return `La promo arrancará en ${min} kg${Number.isFinite(step) && step > 0 ? ` y sumará de a ${step} kg` : ""}.`;
    }
    return `La promo arrancará en ${min} unidades${Number.isFinite(step) && step > 0 ? ` y sumará de a ${step} unidades` : ""}.`;
  }, [formData.isOnSale, formData.minPurchaseQty, formData.qtyStep, formData.unitType]);

  /* ─── Dialog open/close ─── */

  const handleOpenDialog = (product?: ProductDTO) => {
    if (product) {
      setEditingProduct(product);
      const vatRateStr: ProductFormData["vatRate"] =
        product.vatRate === 0.21 ? "0.21" : product.vatRate === 0.105 ? "0.105" : "";
      const mu = (() => {
        const raw = product.measurementUnit ?? "un";
        return product.unitType === "PER_KG" && raw === "un" ? "kg" : raw;
      })();
      setFormData({
        name: product.name,
        slug: product.slug,
        description: product.description || "",
        price: (product.price / 100).toString(),
        categoryId: product.categoryId,
        imageFile: null,
        stock: product.stock.toString(),
        unitType: deriveUnitType(mu),
        vatRate: vatRateStr,
        isOnSale: product.isOnSale,
        salePrice: product.salePrice ? (product.salePrice / 100).toString() : "",
        saleEndDate: product.saleEndDate ? toDatetimeLocalValue(product.saleEndDate) : "",
        minPurchaseQty: product.minPurchaseQty != null ? String(product.minPurchaseQty) : "",
        qtyStep: product.qtyStep != null ? String(product.qtyStep) : "",
        maxPurchaseQty: product.maxPurchaseQty != null ? String(product.maxPurchaseQty) : "",
        allowsDecimals: Boolean(product.allowsDecimals ?? false),
        measurementUnit: mu,
        unitMultiplier: product.unitMultiplier != null ? String(product.unitMultiplier) : "1",
        brand: product.brand ?? "",
        isFeatured: product.isFeatured,
        isActive: product.isActive,
      });
      setPreviewUrl(product.image ?? null);
    } else {
      setEditingProduct(null);
      setFormData(emptyFormData);
      setPreviewUrl(null);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    setFormData(emptyFormData);
    setPreviewUrl(null);
  };

  const onPickImage = (file: File | null) => {
    setFormData((p) => ({ ...p, imageFile: file }));
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(editingProduct?.image ?? null);
    }
  };

  /* ─── Mutations ─── */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("slug", formData.slug);
      fd.append("description", formData.description || "");
      fd.append("price", formData.price || "0");
      fd.append("categoryId", formData.categoryId);
      fd.append("stock", formData.stock || "0");
      fd.append("unitType", formData.unitType);
      fd.append("vatRate", formData.vatRate);
      fd.append("isOnSale", String(formData.isOnSale));
      fd.append("salePrice", formData.salePrice || "");
      fd.append("saleEndDate", formData.saleEndDate || "");
      fd.append("minPurchaseQty", formData.minPurchaseQty || "");
      fd.append("qtyStep", formData.qtyStep || "");
      fd.append("maxPurchaseQty", formData.maxPurchaseQty || "");
      fd.append("allowsDecimals", String(formData.allowsDecimals));
      fd.append("measurementUnit", formData.measurementUnit || "un");
      fd.append("unitMultiplier", formData.unitMultiplier || "1");
      fd.append("brand", formData.brand || "");
      fd.append("isFeatured", String(formData.isFeatured));
      fd.append("isActive", String(formData.isActive));
      if (formData.imageFile) fd.append("image", formData.imageFile);

      const response = editingProduct
        ? await fetch(`/api/admin/products/${editingProduct.id}`, { method: "PUT", body: fd })
        : await fetch("/api/admin/products", { method: "POST", body: fd });

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Error al guardar producto");

      toast.success(editingProduct ? "Producto actualizado" : "Producto creado");
      handleCloseDialog();
      router.refresh();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error al guardar producto";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return;
    try {
      const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Error al eliminar producto");
      }
      toast.success("Producto eliminado");
      router.refresh();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error al eliminar";
      toast.error(msg);
    }
  };

  const handleToggleActive = async (product: ProductDTO) => {
    const newIsActive = !product.isActive;
    if (!confirm(`¿Cambiar "${product.name}" a ${newIsActive ? "Activo" : "Inactivo"}?`)) return;

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, isActive: newIsActive } : p))
    );

    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newIsActive }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      // Revert
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isActive: product.isActive } : p))
      );
      toast.error("Error al cambiar el estado");
    }
  };

  const handleDuplicate = async (product: ProductDTO) => {
    if (!confirm(`¿Duplicar "${product.name}"? Se creará como inactivo.`)) return;
    try {
      const fd = new FormData();
      const newName = `Copia de ${product.name}`;
      fd.append("name", newName);
      fd.append("slug", `${generateSlug(newName)}-${Date.now()}`);
      fd.append("description", product.description ?? "");
      fd.append("price", String(product.price / 100));
      fd.append("categoryId", product.categoryId);
      fd.append("stock", "0");
      fd.append("unitType", product.unitType);
      fd.append("vatRate", product.vatRate != null ? String(product.vatRate) : "");
      fd.append("isOnSale", "false");
      fd.append("salePrice", "");
      fd.append("saleEndDate", "");
      fd.append("minPurchaseQty", product.minPurchaseQty != null ? String(product.minPurchaseQty) : "");
      fd.append("qtyStep", product.qtyStep != null ? String(product.qtyStep) : "");
      fd.append("maxPurchaseQty", product.maxPurchaseQty != null ? String(product.maxPurchaseQty) : "");
      fd.append("allowsDecimals", String(product.allowsDecimals));
      fd.append("measurementUnit", product.measurementUnit);
      fd.append("unitMultiplier", String(product.unitMultiplier));
      fd.append("brand", product.brand ?? "");
      fd.append("isFeatured", "false");
      fd.append("isActive", "false");

      const res = await fetch("/api/admin/products", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Error al duplicar");
      toast.success("Producto duplicado (inactivo)");
      router.refresh();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error al duplicar";
      toast.error(msg);
    }
  };

  /* ─── Render ─── */

  const isEmpty = products.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Productos</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {hasFilters ? (
              <>
                <span className="text-white font-medium">{total}</span> de{" "}
                <span className="text-zinc-300">todos</span> los productos
              </>
            ) : (
              <>
                <span className="text-white font-medium">{total}</span> productos en total
              </>
            )}
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Producto
            </Button>
          </DialogTrigger>

          <DialogContent className="bg-zinc-900 text-white border-zinc-800 max-w-3xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {editingProduct ? "Editar Producto" : "Nuevo Producto"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-1">

              {/* ── Identificación ── */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Identificación</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormData((p) => ({ ...p, name: v, slug: generateSlug(v) }));
                      }}
                      required
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                      required
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    rows={2}
                    className="bg-zinc-800 border-zinc-700 resize-none"
                  />
                </div>
              </div>

              {/* ── Categoría y Marca ── */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Categoría y Marca</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="category">Categoría *</Label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={goCreateCategory}
                        className="h-7 px-2 text-xs border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
                      >
                        + Nueva
                      </Button>
                    </div>
                    <select
                      id="category"
                      className="w-full h-10 rounded-md bg-zinc-800 border border-zinc-700 px-3 text-white text-sm"
                      value={formData.categoryId}
                      onChange={(e) => setFormData((p) => ({ ...p, categoryId: e.target.value }))}
                      required
                    >
                      <option value="" disabled>Seleccionar categoría</option>
                      {categories.map((cat) => {
                        const parentName = cat.parentId
                          ? categories.find((c) => c.id === cat.parentId)?.name
                          : null;
                        return (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}{parentName ? ` (${parentName})` : ""}
                          </option>
                        );
                      })}
                    </select>
                    <p className="text-xs text-zinc-400">
                      IVA de categoría:{" "}
                      <span className="text-zinc-200">{formatVatLabel(selectedCategoryVat)}</span>
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="brand">Marca</Label>
                    <input
                      id="brand"
                      list="brand-suggestions"
                      type="text"
                      placeholder="Ej: La Serenísima, Marolio..."
                      value={formData.brand}
                      onChange={(e) => setFormData((p) => ({ ...p, brand: e.target.value }))}
                      className="w-full h-10 rounded-md bg-zinc-800 border border-zinc-700 px-3 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      autoComplete="off"
                    />
                    <datalist id="brand-suggestions">
                      {brands.map((b) => <option key={b} value={b} />)}
                    </datalist>
                    <p className="text-xs text-zinc-400">Opcional · filtro en el storefront</p>
                  </div>
                </div>
              </div>

              {/* ── Precio, Stock e IVA ── */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Precio, Stock e IVA</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="price">Precio (ARS) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
                      required
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="stock">Stock ({stockLabel}) *</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      step={stockStep}
                      value={formData.stock}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((p) => ({ ...p, stock: val === "" ? "" : String(Number(val)) }));
                      }}
                      required
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="vatRate">IVA del producto</Label>
                    <select
                      id="vatRate"
                      className="w-full h-10 rounded-md bg-zinc-800 border border-zinc-700 px-3 text-white text-sm"
                      value={formData.vatRate}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          vatRate: e.target.value as ProductFormData["vatRate"],
                        }))
                      }
                    >
                      <option value="">Usar IVA de categoría</option>
                      <option value="0.105">10,5%</option>
                      <option value="0.21">21%</option>
                    </select>
                    <p className="text-xs text-zinc-400">
                      Efectivo:{" "}
                      <span className="text-zinc-200">{formatVatLabel(effectiveVatPreview)}</span>
                      {formData.vatRate ? " (pisado)" : " (categoría)"}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Precio por unidad ── */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Precio por unidad de medida</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Al estilo DIA · "Precio por 1 Kg $ 9.050". Dejá "un × 1" si no aplica.</p>
                  </div>
                  {unitPricePreview && (
                    <span className="flex-shrink-0 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1">
                      {unitPricePreview.label}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="measurementUnit">Unidad</Label>
                    <select
                      id="measurementUnit"
                      className="w-full h-10 rounded-md bg-zinc-800 border border-zinc-700 px-3 text-white text-sm"
                      value={formData.measurementUnit}
                      onChange={(e) => {
                        const mu = e.target.value;
                        setFormData((p) => ({
                          ...p,
                          measurementUnit: mu,
                          unitType: deriveUnitType(mu),
                          allowsDecimals: mu !== "kg" ? false : p.allowsDecimals,
                        }));
                      }}
                    >
                      <option value="un">un — unidad</option>
                      <option value="kg">kg — kilogramo</option>
                      <option value="g">g — gramos</option>
                      <option value="l">l — litro</option>
                      <option value="ml">ml — mililitros</option>
                      <option value="m">m — metro</option>
                      <option value="m2">m² — metro cuadrado</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="unitMultiplier">Cantidad ({formData.measurementUnit})</Label>
                    <Input
                      id="unitMultiplier"
                      type="number"
                      min="0.001"
                      step="0.001"
                      placeholder="Ej: 500"
                      value={formData.unitMultiplier}
                      onChange={(e) => setFormData((p) => ({ ...p, unitMultiplier: e.target.value }))}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                </div>
              </div>

              {/* ── Imagen ── */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Imagen</p>
                <div className="flex gap-4 items-start">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="imageFile">Archivo</Label>
                    <Input
                      id="imageFile"
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/avif"
                      className="bg-zinc-800 border-zinc-700"
                      onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
                    />
                    <p className="text-xs text-zinc-500">
                      {formData.imageFile
                        ? formData.imageFile.name
                        : previewUrl
                          ? "Imagen actual del producto"
                          : "Sin imagen — el producto quedará sin foto"}
                    </p>
                  </div>
                  {previewUrl && (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-950 flex-shrink-0">
                      <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* ── Oferta ── */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Oferta</p>
                    {!formData.isOnSale && (
                      <p className="text-xs text-zinc-500 mt-0.5">Activá para definir precio especial</p>
                    )}
                  </div>
                  <Switch
                    id="isOnSale"
                    checked={formData.isOnSale}
                    onCheckedChange={(checked) => setFormData((p) => ({ ...p, isOnSale: checked }))}
                  />
                </div>

                {formData.isOnSale && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="salePrice">Precio de Oferta (ARS)</Label>
                        <Input
                          id="salePrice"
                          type="number"
                          step="0.01"
                          value={formData.salePrice}
                          onChange={(e) => setFormData((p) => ({ ...p, salePrice: e.target.value }))}
                          className="bg-zinc-800 border-zinc-700"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="saleEndDate">Fin de la oferta</Label>
                        <Input
                          id="saleEndDate"
                          type="datetime-local"
                          value={formData.saleEndDate}
                          onChange={(e) => setFormData((p) => ({ ...p, saleEndDate: e.target.value }))}
                          className="bg-zinc-800 border-zinc-700"
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3 space-y-3">
                      <p className="text-xs font-semibold text-zinc-400">Reglas de compra para la promo</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="minPurchaseQty" className="text-xs">
                            Mín. ({formData.unitType === "PER_KG" ? "kg" : "un"})
                          </Label>
                          <Input
                            id="minPurchaseQty"
                            type="number"
                            step={quantityStepInput}
                            min="0"
                            value={formData.minPurchaseQty}
                            onChange={(e) => setFormData((p) => ({ ...p, minPurchaseQty: e.target.value }))}
                            className="bg-zinc-800 border-zinc-700"
                            placeholder={formData.unitType === "PER_KG" ? "2" : "3"}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="qtyStep" className="text-xs">
                            Incremento ({formData.unitType === "PER_KG" ? "kg" : "un"})
                          </Label>
                          <Input
                            id="qtyStep"
                            type="number"
                            step={quantityStepInput}
                            min="0"
                            value={formData.qtyStep}
                            onChange={(e) => setFormData((p) => ({ ...p, qtyStep: e.target.value }))}
                            className="bg-zinc-800 border-zinc-700"
                            placeholder="1"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="maxPurchaseQty" className="text-xs">
                            Máx. ({formData.unitType === "PER_KG" ? "kg" : "un"})
                          </Label>
                          <Input
                            id="maxPurchaseQty"
                            type="number"
                            step={quantityStepInput}
                            min="0"
                            value={formData.maxPurchaseQty}
                            onChange={(e) => setFormData((p) => ({ ...p, maxPurchaseQty: e.target.value }))}
                            className="bg-zinc-800 border-zinc-700"
                            placeholder="Opc."
                          />
                        </div>
                      </div>

                      {formData.unitType === "PER_KG" && (
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="allowsDecimals" className="text-sm cursor-pointer">
                              Permitir decimales
                            </Label>
                            <p className="text-xs text-zinc-400">Acepta 0.5 kg, 1.5 kg, etc.</p>
                          </div>
                          <Switch
                            id="allowsDecimals"
                            checked={formData.allowsDecimals}
                            onCheckedChange={(checked) =>
                              setFormData((p) => ({ ...p, allowsDecimals: checked }))
                            }
                          />
                        </div>
                      )}

                      {offerPreviewText && (
                        <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-2">
                          <p className="text-sm text-orange-300">{offerPreviewText}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Configuración ── */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Configuración</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between rounded-lg bg-zinc-800/60 px-3 py-2.5">
                    <Label htmlFor="isFeatured" className="cursor-pointer text-sm">Destacado</Label>
                    <Switch
                      id="isFeatured"
                      checked={formData.isFeatured}
                      onCheckedChange={(checked) => setFormData((p) => ({ ...p, isFeatured: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-zinc-800/60 px-3 py-2.5">
                    <Label htmlFor="isActive" className="cursor-pointer text-sm">Activo</Label>
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData((p) => ({ ...p, isActive: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  className="flex-1 border-zinc-700"
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  disabled={submitting}
                >
                  {submitting ? "Guardando..." : editingProduct ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card className="bg-zinc-900 border-zinc-800 p-4">
        <AdminProductFilters categories={categories} />
      </Card>

      {/* Tabla */}
      <Card className="bg-zinc-900 border-zinc-800">
        <div className="overflow-x-auto">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <Search className="h-12 w-12 text-zinc-700" />
              <div>
                <p className="text-lg font-medium text-zinc-300">No se encontraron productos</p>
                {hasFilters && (
                  <p className="text-sm text-zinc-500 mt-1">
                    Probá ajustando los filtros o limpiando la búsqueda
                  </p>
                )}
              </div>
              {hasFilters && (
                <Button
                  variant="outline"
                  className="border-zinc-700"
                  onClick={() => router.push("/admin/productos")}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-zinc-800">
                <tr>
                  <th className="text-left p-4 text-zinc-400 font-medium">Imagen</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Producto</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Categoría</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Precio</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Stock</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">IVA</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Estado</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const effectiveVat = product.vatRate ?? product.category?.vatRate ?? null;
                  const vatText = formatVatLabel(effectiveVat);
                  const isOverride = product.vatRate != null;
                  const offerRuleText = getOfferRuleText(product);

                  return (
                    <tr key={product.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                      <td className="p-4">
                        <div className="relative w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                              Sin img
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <div>
                          <p className="font-medium text-white flex items-center gap-2">
                            {product.name}
                            {product.isFeatured && (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </p>
                          <p className="text-sm text-zinc-400">{product.slug}</p>
                        </div>
                      </td>

                      <td className="p-4 text-zinc-300">{product.category.name}</td>

                      <td className="p-4">
                        <div>
                          <p className="text-white font-medium">{formatPrice(product.price)}</p>
                          {product.isOnSale && product.salePrice && (
                            <p className="text-sm text-orange-500">
                              Oferta: {formatPrice(product.salePrice)}
                            </p>
                          )}
                          {offerRuleText && (
                            <p className="text-xs text-orange-300 mt-1">{offerRuleText}</p>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-zinc-300">
                        {product.stock} {unitLabelFor(product.unitType)}
                      </td>

                      <td className="p-4">
                        <div className="text-zinc-200">
                          {vatText}
                          {isOverride && (
                            <span className="ml-2 text-xs text-orange-400">(pisado)</span>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(product)}
                            title="Click para cambiar estado"
                            className={`px-2 py-1 text-xs rounded-full cursor-pointer transition-opacity hover:opacity-75 ${
                              product.isActive
                                ? "bg-green-500/20 text-green-500"
                                : "bg-zinc-700 text-zinc-400"
                            }`}
                          >
                            {product.isActive ? "Activo" : "Inactivo"}
                          </button>
                          {product.isOnSale && (
                            <span className="px-2 py-1 text-xs rounded-full bg-orange-500/20 text-orange-500">
                              Oferta
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDialog(product)}
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDuplicate(product)}
                            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
                            title="Duplicar"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(product.id, product.name)}
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {!isEmpty && (
          <div className="px-4 pb-4">
            <AdminPagination
              total={total}
              currentPage={currentPage}
              pageSize={pageSize}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
