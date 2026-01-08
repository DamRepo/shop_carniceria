'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    receiveOffers: false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          receiveOffers: formData.receiveOffers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrarse');
      }

      toast.success('¡Cuenta creada exitosamente!');
      router.push('/auth/login');
    } catch (error: any) {
      console.error('Register error:', error);
      toast.error(error.message || 'Error al crear cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-white">
            Crear Cuenta
          </CardTitle>
          <CardDescription className="text-center text-zinc-400">
            Regístrate para recibir ofertas exclusivas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">
                Nombre Completo
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Juan Pérez"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-white">
                Teléfono (Opcional)
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+54 9 11 1234-5678"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">
                Confirmar Contraseña
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="receiveOffers"
                checked={formData.receiveOffers}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, receiveOffers: checked as boolean })
                }
              />
              <label
                htmlFor="receiveOffers"
                className="text-sm text-zinc-400 cursor-pointer"
              >
                Quiero recibir ofertas y promociones
              </label>
            </div>
            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              disabled={loading}
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-zinc-400">¿Ya tienes una cuenta? </span>
            <Link
              href="/auth/login"
              className="text-orange-500 hover:text-orange-400 font-medium"
            >
              Inicia sesión
            </Link>
          </div>
          <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
            <Link
              href="/"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Volver al inicio
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
