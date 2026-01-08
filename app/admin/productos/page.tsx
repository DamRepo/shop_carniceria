'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils-format';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  categoryId: string;
  imageUrl: string | null;
  stock: number;
  unitType: string;
  isOnSale: boolean;
  salePrice: number | null;
  saleEndDate: Date | null;
  isFeatured: boolean;
  isActive: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  price: string;
  categoryId: string;
  imageUrl: string;
  stock: string;
  unitType: string;
  isOnSale: boolean;
  salePrice: string;
  saleEndDate: string;
  isFeatured: boolean;
  isActive: boolean;
}

const emptyFormData: ProductFormData = {
  name: '',
  slug: '',
  description: '',
  price: '',
  categoryId: '',
  imageUrl: '',
  stock: '0',
  unitType: 'UNIT',
  isOnSale: false,
  salePrice: '',
  saleEndDate: '',
  isFeatured: false,
  isActive: true,
};

export default function ProductosAdmin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyFormData);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/admin/categories'),
      ]);

      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();

      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        slug: product.slug,
        description: product.description || '',
        price: (product.price / 100).toString(),
        categoryId: product.categoryId,
        imageUrl: product.imageUrl || '',
        stock: product.stock.toString(),
        unitType: product.unitType,
        isOnSale: product.isOnSale,
        salePrice: product.salePrice ? (product.salePrice / 100).toString() : '',
        saleEndDate: product.saleEndDate
          ? new Date(product.saleEndDate).toISOString().split('T')[0]
          : '',
        isFeatured: product.isFeatured,
        isActive: product.isActive,
      });
    } else {
      setEditingProduct(null);
      setFormData(emptyFormData);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    setFormData(emptyFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        price: parseFloat(formData.price),
        categoryId: formData.categoryId,
        imageUrl: formData.imageUrl || null,
        stock: parseInt(formData.stock),
        unitType: formData.unitType,
        isOnSale: formData.isOnSale,
        salePrice: formData.salePrice ? parseFloat(formData.salePrice) : null,
        saleEndDate: formData.saleEndDate || null,
        isFeatured: formData.isFeatured,
        isActive: formData.isActive,
      };

      let response;
      if (editingProduct) {
        response = await fetch(`/api/admin/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar producto');
      }

      toast.success(
        editingProduct ? 'Producto actualizado' : 'Producto creado'
      );
      handleCloseDialog();
      fetchData();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.message || 'Error al guardar producto');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar producto');
      }

      toast.success('Producto eliminado');
      fetchData();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar producto');
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Productos</h1>
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
          <DialogContent className="bg-zinc-900 text-white border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        name: e.target.value,
                        slug: generateSlug(e.target.value),
                      });
                    }}
                    required
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    required
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio (ARS) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    required
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock *</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: e.target.value })
                    }
                    required
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría *</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, categoryId: value })
                    }
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitType">Tipo de Unidad *</Label>
                  <Select
                    value={formData.unitType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, unitType: value })
                    }
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="UNIT">Unidad</SelectItem>
                      <SelectItem value="KILOGRAM">Kilogramo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">URL de Imagen</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, imageUrl: e.target.value })
                  }
                  placeholder="https://wpforms.com/wp-content/uploads/2020/06/file-upload-form-template-2-1024x876.png"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <Label htmlFor="isOnSale">En Oferta</Label>
                  <Switch
                    id="isOnSale"
                    checked={formData.isOnSale}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isOnSale: checked })
                    }
                  />
                </div>

                {formData.isOnSale && (
                  <div className="grid grid-cols-2 gap-4 pl-4">
                    <div className="space-y-2">
                      <Label htmlFor="salePrice">Precio de Oferta (ARS)</Label>
                      <Input
                        id="salePrice"
                        type="number"
                        step="0.01"
                        value={formData.salePrice}
                        onChange={(e) =>
                          setFormData({ ...formData, salePrice: e.target.value })
                        }
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="saleEndDate">Fecha de Finalización</Label>
                      <Input
                        id="saleEndDate"
                        type="date"
                        value={formData.saleEndDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            saleEndDate: e.target.value,
                          })
                        }
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isFeatured">Producto Destacado</Label>
                <Switch
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isFeatured: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Producto Activo</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>

              <div className="flex gap-3 pt-4">
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
                  {submitting
                    ? 'Guardando...'
                    : editingProduct
                    ? 'Actualizar'
                    : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-zinc-800">
              <tr>
                <th className="text-left p-4 text-zinc-400 font-medium">Imagen</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Producto</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Categoría</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Precio</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Stock</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Estado</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-zinc-800 hover:bg-zinc-800/50"
                >
                  <td className="p-4">
                    <div className="relative w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          Sin imagen
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
                      <p className="text-white font-medium">
                        {formatPrice(product.price)}
                      </p>
                      {product.isOnSale && product.salePrice && (
                        <p className="text-sm text-orange-500">
                          Oferta: {formatPrice(product.salePrice)}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-zinc-300">
                    {product.stock} {product.unitType === 'KILOGRAM' ? 'kg' : 'un'}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {product.isActive ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-500">
                          Activo
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-zinc-700 text-zinc-400">
                          Inactivo
                        </span>
                      )}
                      {product.isOnSale && (
                        <span className="px-2 py-1 text-xs rounded-full bg-orange-500/20 text-orange-500">
                          Oferta
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDialog(product)}
                        className="text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(product.id)}
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {products.length === 0 && (
            <div className="text-center py-12 text-zinc-400">
              No hay productos registrados
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
